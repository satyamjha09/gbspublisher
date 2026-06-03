import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ProjectStatus } from "@prisma/client";
import { PrismaService } from "@gbs/database";
import { CreateEditionDto, UpdateEditionDto } from "./editions.dto";

@Injectable()
export class EditionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, projectId: string, dto: CreateEditionDto) {
    await this.ensureProjectOwner(ownerId, projectId);

    const existingEdition = await this.prisma.edition.findFirst({
      where: {
        projectId,
        format: dto.format
      }
    });

    if (existingEdition) {
      throw new BadRequestException(`This project already has a ${dto.format} edition`);
    }

    return this.prisma.edition.create({
      data: {
        projectId,
        format: dto.format,
        isbn: dto.isbn,
        price: dto.price,
        currency: dto.currency ?? "USD",
        isPublished: dto.isPublished ?? false
      }
    });
  }

  async findAll(ownerId: string, projectId: string) {
    await this.ensureProjectOwner(ownerId, projectId);

    return this.prisma.edition.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" }
    });
  }

  async findOne(ownerId: string, projectId: string, editionId: string) {
    await this.ensureProjectOwner(ownerId, projectId);

    const edition = await this.prisma.edition.findFirst({
      where: {
        id: editionId,
        projectId
      }
    });

    if (!edition) {
      throw new NotFoundException("Edition not found");
    }

    return edition;
  }

  async update(ownerId: string, projectId: string, editionId: string, dto: UpdateEditionDto) {
    await this.findOne(ownerId, projectId, editionId);

    return this.prisma.edition.update({
      where: { id: editionId },
      data: {
        isbn: dto.isbn,
        price: dto.price,
        currency: dto.currency,
        isPublished: dto.isPublished
      }
    });
  }

  async remove(ownerId: string, projectId: string, editionId: string) {
    const project = await this.ensureProjectOwner(ownerId, projectId);
    const edition = await this.findOne(ownerId, projectId, editionId);

    if (project.status === ProjectStatus.PUBLISHED || edition.isPublished) {
      throw new ForbiddenException("Published editions cannot be deleted");
    }

    await this.prisma.edition.delete({
      where: { id: editionId }
    });

    return {
      success: true,
      message: "Edition deleted successfully"
    };
  }

  private async ensureProjectOwner(ownerId: string, projectId: string) {
    const project = await this.prisma.bookProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException("You do not have access to this project");
    }

    return project;
  }
}
