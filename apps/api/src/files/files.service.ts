import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileProcessingStatus } from "@prisma/client";
import { PrismaService } from "@gbs/database";
import { QueueService } from "@gbs/queue";
import { createSlug } from "@gbs/common";
import { S3_CLIENT } from "./files.constants";
import { CompleteUploadDto, CreateUploadDto } from "./files.dto";

type S3SignerClient = ConstructorParameters<typeof PutObjectCommand>[0] extends never
  ? never
  : Parameters<typeof getSignedUrl>[1] extends never
    ? never
    : Parameters<typeof getSignedUrl>[0];

@Injectable()
export class FilesService {
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
    @Inject(S3_CLIENT) private readonly s3Client: S3SignerClient
  ) {
    this.bucket = this.config.get<string>("S3_BUCKET", "publication-assets");
  }

  async createUpload(ownerId: string, dto: CreateUploadDto) {
    if (dto.projectId) {
      const project = await this.prisma.bookProject.findUnique({
        where: { id: dto.projectId }
      });

      if (!project || project.ownerId !== ownerId) {
        throw new NotFoundException("Project not found");
      }
    }

    const storageKey = this.buildStorageKey(ownerId, dto);

    const fileAsset = await this.prisma.fileAsset.create({
      data: {
        ownerId,
        projectId: dto.projectId,
        type: dto.type,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey,
        processingStatus: FileProcessingStatus.PENDING
      }
    });

    const uploadUrl = await getSignedUrl(
      this.s3Client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: dto.mimeType
      }),
      { expiresIn: 60 * 10 }
    );

    return {
      fileAsset,
      uploadUrl,
      method: "PUT",
      expiresInSeconds: 600
    };
  }

  async completeUpload(ownerId: string, fileAssetId: string, dto: CompleteUploadDto) {
    const fileAsset = await this.findOwnedFile(ownerId, fileAssetId);

    const updatedFileAsset = await this.prisma.fileAsset.update({
      where: { id: fileAsset.id },
      data: {
        checksum: dto.checksum,
        processingStatus: FileProcessingStatus.SCANNING
      }
    });

    await this.queueService.addFileProcessingJob("scan-file", {
      fileAssetId: updatedFileAsset.id,
      ownerId: updatedFileAsset.ownerId,
      projectId: updatedFileAsset.projectId
    });

    return {
      success: true,
      message: "Upload completed. File is queued for scanning.",
      fileAsset: updatedFileAsset
    };
  }

  async listProjectFiles(ownerId: string, projectId: string) {
    const project = await this.prisma.bookProject.findUnique({
      where: { id: projectId }
    });

    if (!project || project.ownerId !== ownerId) {
      throw new NotFoundException("Project not found");
    }

    return this.prisma.fileAsset.findMany({
      where: {
        ownerId,
        projectId
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createInternalDownloadUrl(storageKey: string, expiresInSeconds = 60 * 5) {
    const url = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey
      }),
      { expiresIn: expiresInSeconds }
    );

    return {
      url,
      expiresInSeconds
    };
  }

  private async findOwnedFile(ownerId: string, fileAssetId: string) {
    const fileAsset = await this.prisma.fileAsset.findUnique({
      where: { id: fileAssetId }
    });

    if (!fileAsset || fileAsset.ownerId !== ownerId) {
      throw new NotFoundException("File asset not found");
    }

    return fileAsset;
  }

  private buildStorageKey(ownerId: string, dto: CreateUploadDto) {
    const safeName = createSlug(dto.originalName.replace(/\.[^.]+$/, "")) || "asset";
    const projectPart = dto.projectId ?? "unassigned";
    return `users/${ownerId}/projects/${projectPart}/${Date.now()}-${safeName}`;
  }
}
