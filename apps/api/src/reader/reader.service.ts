import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FileAssetType, FileProcessingStatus, ProjectStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "@gbs/database";
import { FilesService } from "../files/files.service";
import { CreateBookmarkDto, CreateHighlightDto, UpdateProgressDto } from "./reader.dto";

@Injectable()
export class ReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService
  ) {}

  async openEdition(readerId: string, editionId: string) {
    const access = await this.ensureReaderAccess(readerId, editionId);

    const files = await this.prisma.fileAsset.findMany({
      where: {
        projectId: access.projectId,
        processingStatus: FileProcessingStatus.COMPLETED,
        type: {
          in: [FileAssetType.EPUB, FileAssetType.PDF, FileAssetType.MANUSCRIPT]
        }
      }
    });

    if (files.length === 0) {
      throw new NotFoundException("No readable file found for this book");
    }

    const selectedFile =
      files.find((file) => file.type === FileAssetType.EPUB) ??
      files.find((file) => file.type === FileAssetType.PDF) ??
      files[0];
    const signedFile = await this.filesService.createInternalDownloadUrl(selectedFile.storageKey, 60 * 10);

    const progress = await this.prisma.readingProgress.upsert({
      where: {
        readerId_editionId: {
          readerId,
          editionId
        }
      },
      update: {
        lastReadAt: new Date()
      },
      create: {
        readerId,
        projectId: access.projectId,
        editionId,
        percentage: new Decimal(0)
      }
    });

    return {
      book: access.project,
      edition: access.edition,
      file: {
        id: selectedFile.id,
        type: selectedFile.type,
        mimeType: selectedFile.mimeType,
        originalName: selectedFile.originalName,
        downloadUrl: signedFile.url,
        expiresInSeconds: signedFile.expiresInSeconds
      },
      progress
    };
  }

  async getProgress(readerId: string, editionId: string) {
    await this.ensureReaderAccess(readerId, editionId);

    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        readerId_editionId: {
          readerId,
          editionId
        }
      }
    });

    return (
      progress ?? {
        readerId,
        editionId,
        currentLocator: null,
        percentage: 0
      }
    );
  }

  async updateProgress(readerId: string, editionId: string, dto: UpdateProgressDto) {
    const access = await this.ensureReaderAccess(readerId, editionId);

    return this.prisma.readingProgress.upsert({
      where: {
        readerId_editionId: {
          readerId,
          editionId
        }
      },
      update: {
        currentLocator: dto.currentLocator,
        percentage: new Decimal(dto.percentage),
        lastReadAt: new Date()
      },
      create: {
        readerId,
        projectId: access.projectId,
        editionId,
        currentLocator: dto.currentLocator,
        percentage: new Decimal(dto.percentage),
        lastReadAt: new Date()
      }
    });
  }

  async listBookmarks(readerId: string, editionId: string) {
    await this.ensureReaderAccess(readerId, editionId);

    return this.prisma.readerBookmark.findMany({
      where: { readerId, editionId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createBookmark(readerId: string, editionId: string, dto: CreateBookmarkDto) {
    const access = await this.ensureReaderAccess(readerId, editionId);

    return this.prisma.readerBookmark.create({
      data: {
        readerId,
        projectId: access.projectId,
        editionId,
        locator: dto.locator,
        label: dto.label,
        note: dto.note
      }
    });
  }

  async deleteBookmark(readerId: string, bookmarkId: string) {
    const bookmark = await this.prisma.readerBookmark.findUnique({
      where: { id: bookmarkId }
    });

    if (!bookmark) {
      throw new NotFoundException("Bookmark not found");
    }

    if (bookmark.readerId !== readerId) {
      throw new ForbiddenException("You do not have access to this bookmark");
    }

    await this.prisma.readerBookmark.delete({
      where: { id: bookmarkId }
    });

    return {
      success: true,
      message: "Bookmark deleted successfully"
    };
  }

  async listHighlights(readerId: string, editionId: string) {
    await this.ensureReaderAccess(readerId, editionId);

    return this.prisma.readerHighlight.findMany({
      where: { readerId, editionId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createHighlight(readerId: string, editionId: string, dto: CreateHighlightDto) {
    const access = await this.ensureReaderAccess(readerId, editionId);

    return this.prisma.readerHighlight.create({
      data: {
        readerId,
        projectId: access.projectId,
        editionId,
        locatorStart: dto.locatorStart,
        locatorEnd: dto.locatorEnd,
        textSnippet: dto.textSnippet,
        color: dto.color,
        note: dto.note
      }
    });
  }

  async deleteHighlight(readerId: string, highlightId: string) {
    const highlight = await this.prisma.readerHighlight.findUnique({
      where: { id: highlightId }
    });

    if (!highlight) {
      throw new NotFoundException("Highlight not found");
    }

    if (highlight.readerId !== readerId) {
      throw new ForbiddenException("You do not have access to this highlight");
    }

    await this.prisma.readerHighlight.delete({
      where: { id: highlightId }
    });

    return {
      success: true,
      message: "Highlight deleted successfully"
    };
  }

  private async ensureReaderAccess(readerId: string, editionId: string) {
    const libraryItem = await this.prisma.readerLibraryItem.findUnique({
      where: {
        readerId_editionId: {
          readerId,
          editionId
        }
      },
      include: {
        project: true,
        edition: true
      }
    });

    if (!libraryItem) {
      throw new ForbiddenException("You do not have access to this book");
    }

    if (libraryItem.project.status !== ProjectStatus.PUBLISHED) {
      throw new ForbiddenException("This book is not currently published");
    }

    return libraryItem;
  }
}
