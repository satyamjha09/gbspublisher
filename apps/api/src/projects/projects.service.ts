import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FileAssetType, FileProcessingStatus, ProjectStatus } from "@prisma/client";
import { createSlug } from "@gbs/common";
import { PrismaService } from "@gbs/database";
import { QueueService } from "@gbs/queue";
import { CreateProjectDto, RegisterFileAssetDto, UpdateProjectDto } from "./projects.dto";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  async create(ownerId: string, dto: CreateProjectDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId }
    });

    if (!user) {
      throw new NotFoundException("Owner user not found");
    }

    const slug = dto.slug ?? `${createSlug(dto.title)}-${Date.now()}`;

    return this.prisma.bookProject.create({
      data: {
        ownerId,
        title: dto.title,
        subtitle: dto.subtitle,
        slug,
        description: dto.description,
        language: dto.language ?? "en",
        genre: dto.genre,
        tags: dto.tags ?? [],
        ageRating: dto.ageRating,
        keywords: dto.keywords ?? [],
        coverFileId: dto.coverFileId
      },
      include: {
        editions: true,
        files: true
      }
    });
  }

  listForOwner(ownerId: string) {
    return this.prisma.bookProject.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      include: {
        editions: true,
        files: true
      }
    });
  }

  async getByIdForOwner(ownerId: string, id: string) {
    const project = await this.prisma.bookProject.findUnique({
      where: { id },
      include: {
        editions: true,
        files: true
      }
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException("You do not have access to this project");
    }

    return project;
  }

  async update(ownerId: string, projectId: string, dto: UpdateProjectDto) {
    await this.getByIdForOwner(ownerId, projectId);

    return this.prisma.bookProject.update({
      where: { id: projectId },
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        language: dto.language,
        slug: dto.slug,
        genre: dto.genre,
        tags: dto.tags,
        ageRating: dto.ageRating,
        keywords: dto.keywords,
        coverFileId: dto.coverFileId
      },
      include: {
        editions: true,
        files: true
      }
    });
  }

  async submitForReview(ownerId: string, projectId: string) {
    const project = await this.getByIdForOwner(ownerId, projectId);

    if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.REJECTED) {
      throw new ForbiddenException("Only draft or rejected projects can be submitted for review");
    }

    const problems: string[] = [];

    if (!project.title.trim()) {
      problems.push("Title is required");
    }

    if (!project.description?.trim()) {
      problems.push("Description is required");
    }

    if (!project.genre?.trim()) {
      problems.push("Genre is required");
    }

    if (!project.slug?.trim()) {
      problems.push("Slug is required");
    }

    const hasCompletedManuscript = project.files.some(
      (file) => file.type === FileAssetType.MANUSCRIPT && file.processingStatus === FileProcessingStatus.COMPLETED
    );
    const hasCompletedCover = project.files.some(
      (file) => file.type === FileAssetType.COVER && file.processingStatus === FileProcessingStatus.COMPLETED
    );

    if (!hasCompletedManuscript) {
      problems.push("A completed manuscript file is required");
    }

    if (!hasCompletedCover) {
      problems.push("A completed cover file is required");
    }

    if (project.editions.length === 0) {
      problems.push("At least one edition is required");
    }

    const hasPricedEdition = project.editions.some((edition) => edition.price !== null && Number(edition.price) >= 0);

    if (!hasPricedEdition) {
      problems.push("At least one edition must have a valid price");
    }

    if (problems.length > 0) {
      throw new BadRequestException({
        message: "Project is not ready for review",
        problems
      });
    }

    return this.prisma.bookProject.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.IN_REVIEW,
        submittedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null
      },
      include: {
        editions: true,
        files: true
      }
    });
  }

  async remove(ownerId: string, projectId: string) {
    const project = await this.getByIdForOwner(ownerId, projectId);

    if (project.status === ProjectStatus.PUBLISHED) {
      throw new ForbiddenException("Published projects cannot be deleted");
    }

    await this.prisma.bookProject.delete({
      where: { id: projectId }
    });

    return {
      success: true,
      message: "Project deleted successfully"
    };
  }

  async registerFile(ownerId: string, projectId: string, dto: RegisterFileAssetDto) {
    await this.getByIdForOwner(ownerId, projectId);

    const file = await this.prisma.fileAsset.create({
      data: {
        projectId,
        ownerId,
        type: dto.type,
        originalName: dto.originalName,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        checksum: dto.checksum
      }
    });

    await this.queueService.addFileProcessingJob("scan-file", {
      projectId,
      ownerId,
      fileAssetId: file.id
    });

    return file;
  }
}
