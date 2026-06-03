import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, ProjectStatus, RoyaltyLedgerStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "@gbs/database";
import { CreateCheckoutDto } from "./orders.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async devCheckout(readerId: string, dto: CreateCheckoutDto) {
    const quantity = dto.quantity ?? 1;

    const edition = await this.prisma.edition.findUnique({
      where: { id: dto.editionId },
      include: { project: true }
    });

    if (!edition) {
      throw new NotFoundException("Edition not found");
    }

    if (!edition.isPublished) {
      throw new BadRequestException("This edition is not available for purchase");
    }

    if (edition.project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException("This book is not published");
    }

    const existingLibraryItem = await this.prisma.readerLibraryItem.findUnique({
      where: {
        readerId_editionId: {
          readerId,
          editionId: edition.id
        }
      }
    });

    if (existingLibraryItem) {
      throw new ConflictException("This book is already in your library");
    }

    const unitPrice = new Decimal(edition.price ?? 0);
    const subtotalAmount = unitPrice.mul(quantity);
    const platformFee = subtotalAmount.mul(0.15);
    const creatorNet = subtotalAmount.minus(platformFee);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          readerId,
          status: OrderStatus.PAID,
          currency: edition.currency,
          subtotalAmount,
          platformFee,
          totalAmount: subtotalAmount,
          paymentProvider: "DEV_CHECKOUT",
          paymentRef: `dev_${Date.now()}`,
          paidAt: new Date(),
          items: {
            create: {
              projectId: edition.projectId,
              editionId: edition.id,
              quantity,
              unitPrice,
              currency: edition.currency
            }
          }
        },
        include: { items: true }
      });

      const orderItem = order.items[0];

      await tx.readerLibraryItem.create({
        data: {
          readerId,
          projectId: edition.projectId,
          editionId: edition.id,
          orderItemId: orderItem.id,
          acquiredVia: Number(unitPrice) === 0 ? "FREE_CLAIM" : "PURCHASE"
        }
      });

      await tx.royaltyLedger.create({
        data: {
          orderItemId: orderItem.id,
          projectId: edition.projectId,
          editionId: edition.id,
          creatorId: edition.project.ownerId,
          grossAmount: subtotalAmount,
          platformFee,
          creatorNet,
          currency: edition.currency,
          status: RoyaltyLedgerStatus.SETTLED
        }
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              project: true,
              edition: true,
              royaltyLedger: true
            }
          }
        }
      });
    });
  }

  findMyOrders(readerId: string) {
    return this.prisma.order.findMany({
      where: { readerId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            project: true,
            edition: true
          }
        }
      }
    });
  }

  findMyLibrary(readerId: string) {
    return this.prisma.readerLibraryItem.findMany({
      where: { readerId },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                profiles: {
                  where: { isPublic: true },
                  select: {
                    displayName: true,
                    penName: true,
                    avatarUrl: true
                  },
                  take: 1
                }
              }
            }
          }
        },
        edition: true
      }
    });
  }

  findCreatorRoyaltyLedger(creatorId: string) {
    return this.prisma.royaltyLedger.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
      include: {
        project: true,
        edition: true,
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                status: true,
                paidAt: true,
                createdAt: true
              }
            }
          }
        }
      }
    });
  }
}
