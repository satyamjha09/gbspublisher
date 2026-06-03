import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ProjectStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "@gbs/database";
import { CreateReviewDto, UpdateReviewDto } from "./reviews.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(readerId: string, projectId: string, dto: CreateReviewDto) {
    const project = await this.prisma.bookProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new NotFoundException("Book not found");
    }

    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException("Only published books can be reviewed");
    }

    const existingReview = await this.prisma.review.findUnique({
      where: {
        readerId_projectId: {
          readerId,
          projectId
        }
      }
    });

    if (existingReview) {
      throw new ConflictException("You have already reviewed this book");
    }

    if (dto.editionId) {
      const edition = await this.prisma.edition.findFirst({
        where: {
          id: dto.editionId,
          projectId,
          isPublished: true
        }
      });

      if (!edition) {
        throw new BadRequestException("Edition does not belong to this book");
      }
    }

    const verifiedPurchase = await this.prisma.readerLibraryItem.findFirst({
      where: {
        readerId,
        projectId
      }
    });

    return this.prisma.review.create({
      data: {
        readerId,
        projectId,
        editionId: dto.editionId,
        rating: dto.rating,
        text: dto.text,
        spoilerFlag: dto.spoilerFlag ?? false,
        isVerifiedPurchase: Boolean(verifiedPurchase),
        status: verifiedPurchase ? ReviewStatus.APPROVED : ReviewStatus.PENDING
      }
    });
  }

  findPublicReviewsForBook(projectId: string) {
    return this.prisma.review.findMany({
      where: {
        projectId,
        status: ReviewStatus.APPROVED
      },
      orderBy: { createdAt: "desc" },
      include: {
        reader: {
          select: {
            id: true,
            name: true,
            profiles: {
              where: { isPublic: true },
              select: {
                displayName: true,
                avatarUrl: true
              },
              take: 1
            }
          }
        }
      }
    });
  }

  async getBookReviewStats(projectId: string) {
    const [count, aggregate, distribution] = await Promise.all([
      this.prisma.review.count({
        where: {
          projectId,
          status: ReviewStatus.APPROVED
        }
      }),
      this.prisma.review.aggregate({
        where: {
          projectId,
          status: ReviewStatus.APPROVED
        },
        _avg: {
          rating: true
        }
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where: {
          projectId,
          status: ReviewStatus.APPROVED
        },
        _count: {
          rating: true
        },
        orderBy: {
          rating: "desc"
        }
      })
    ]);

    return {
      count,
      averageRating: aggregate._avg.rating ?? 0,
      distribution: distribution.map((item) => ({
        rating: item.rating,
        count: item._count.rating
      }))
    };
  }

  async updateOwnReview(readerId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.readerId !== readerId) {
      throw new ForbiddenException("You do not have access to this review");
    }

    if (dto.editionId) {
      const edition = await this.prisma.edition.findFirst({
        where: {
          id: dto.editionId,
          projectId: review.projectId,
          isPublished: true
        }
      });

      if (!edition) {
        throw new BadRequestException("Edition does not belong to this book");
      }
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        text: dto.text,
        spoilerFlag: dto.spoilerFlag,
        editionId: dto.editionId,
        status: review.isVerifiedPurchase ? ReviewStatus.APPROVED : ReviewStatus.PENDING,
        moderatedAt: null,
        moderationNote: null
      }
    });
  }

  async deleteOwnReview(readerId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.readerId !== readerId) {
      throw new ForbiddenException("You do not have access to this review");
    }

    await this.prisma.review.delete({
      where: { id: reviewId }
    });

    return {
      success: true,
      message: "Review deleted successfully"
    };
  }

  findPendingReviewsForAdmin() {
    return this.prisma.review.findMany({
      where: {
        status: ReviewStatus.PENDING
      },
      orderBy: { createdAt: "asc" },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        reader: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
  }

  async moderateReview(adminUserId: string, reviewId: string, status: ReviewStatus, note?: string) {
    const allowedStatuses: ReviewStatus[] = [ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.HIDDEN];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException("Invalid moderation status");
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status,
        moderationNote: note,
        moderatedAt: new Date()
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "REVIEW_MODERATED",
        entityType: "Review",
        entityId: reviewId,
        metadata: {
          previousStatus: review.status,
          newStatus: status,
          note
        }
      }
    });

    return updatedReview;
  }
}
