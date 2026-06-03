import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ProjectStatus } from "@prisma/client";
import { PrismaService } from "@gbs/database";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  findReviewQueue() {
    return this.prisma.bookProject.findMany({
      where: { status: ProjectStatus.IN_REVIEW },
      orderBy: { submittedAt: "asc" },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        editions: true,
        files: true
      }
    });
  }

  async findProjectForAdmin(projectId: string) {
    const project = await this.prisma.bookProject.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        editions: true,
        files: true
      }
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return project;
  }

  async approveProject(adminUserId: string, projectId: string) {
    const project = await this.findProjectForAdmin(projectId);

    if (project.status !== ProjectStatus.IN_REVIEW) {
      throw new BadRequestException("Only projects in review can be approved");
    }

    const updatedProject = await this.prisma.bookProject.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.APPROVED,
        approvedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null
      },
      include: {
        editions: true,
        files: true
      }
    });

    await this.audit(adminUserId, "PROJECT_APPROVED", projectId, project.status, ProjectStatus.APPROVED);
    return updatedProject;
  }

  async rejectProject(adminUserId: string, projectId: string, reason: string) {
    const project = await this.findProjectForAdmin(projectId);

    if (project.status !== ProjectStatus.IN_REVIEW) {
      throw new BadRequestException("Only projects in review can be rejected");
    }

    const updatedProject = await this.prisma.bookProject.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason
      },
      include: {
        editions: true,
        files: true
      }
    });

    await this.audit(adminUserId, "PROJECT_REJECTED", projectId, project.status, ProjectStatus.REJECTED, { reason });
    return updatedProject;
  }

  async publishProject(adminUserId: string, projectId: string) {
    const project = await this.findProjectForAdmin(projectId);

    if (project.status !== ProjectStatus.APPROVED) {
      throw new BadRequestException("Only approved projects can be published");
    }

    if (!project.slug) {
      throw new BadRequestException("Project must have a slug before publishing");
    }

    const hasPublishedEdition = project.editions.some((edition) => edition.isPublished);

    if (!hasPublishedEdition) {
      throw new BadRequestException("At least one edition must be marked as published");
    }

    const updatedProject = await this.prisma.bookProject.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.PUBLISHED,
        publishedAt: new Date()
      },
      include: {
        editions: true,
        files: true
      }
    });

    await this.audit(adminUserId, "PROJECT_PUBLISHED", projectId, project.status, ProjectStatus.PUBLISHED);
    return updatedProject;
  }

  private audit(
    actorUserId: string,
    action: string,
    entityId: string,
    previousStatus: ProjectStatus,
    newStatus: ProjectStatus,
    metadata?: Record<string, unknown>
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: "BookProject",
        entityId,
        metadata: {
          previousStatus,
          newStatus,
          ...metadata
        }
      }
    });
  }
}
