import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { FileAssetType, FileProcessingStatus } from "@prisma/client";
import type { Job } from "bullmq";
import { PrismaService } from "@gbs/database";
import { QUEUES, QueueService, type FileProcessingJobData } from "@gbs/queue";

@Processor(QUEUES.fileProcessing)
export class FileProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(FileProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {
    super();
  }

  async process(job: Job<FileProcessingJobData>): Promise<unknown> {
    this.logger.log(`Processing ${job.name} for file ${job.data.fileAssetId}`);

    if (job.name === "scan-file") {
      return this.scanFile(job);
    }

    if (job.name === "validate-manuscript") {
      return this.validateFile(job.data, "Manuscript validation completed");
    }

    if (job.name === "validate-cover") {
      return this.validateFile(job.data, "Cover validation completed");
    }

    if (job.name === "generate-preview") {
      return {
        success: true,
        message: "Preview generation placeholder completed"
      };
    }

    throw new Error(`Unknown file processing job: ${job.name}`);
  }

  private async scanFile(job: Job<FileProcessingJobData>) {
    const file = await this.findFile(job.data.fileAssetId);

    await this.prisma.fileAsset.update({
      where: { id: file.id },
      data: { processingStatus: FileProcessingStatus.SCANNING }
    });

    await this.sleep(250);

    await this.prisma.fileAsset.update({
      where: { id: file.id },
      data: { processingStatus: FileProcessingStatus.CLEAN }
    });

    if (file.type === FileAssetType.MANUSCRIPT) {
      await this.queueService.addFileProcessingJob("validate-manuscript", {
        fileAssetId: file.id,
        ownerId: file.ownerId,
        projectId: file.projectId
      });
    }

    if (file.type === FileAssetType.COVER) {
      await this.queueService.addFileProcessingJob("validate-cover", {
        fileAssetId: file.id,
        ownerId: file.ownerId,
        projectId: file.projectId
      });
    }

    return {
      success: true,
      status: FileProcessingStatus.CLEAN
    };
  }

  private async validateFile(data: FileProcessingJobData, message: string) {
    const file = await this.findFile(data.fileAssetId);

    await this.prisma.fileAsset.update({
      where: { id: file.id },
      data: { processingStatus: FileProcessingStatus.PROCESSING }
    });

    await this.sleep(250);

    await this.prisma.fileAsset.update({
      where: { id: file.id },
      data: { processingStatus: FileProcessingStatus.COMPLETED }
    });

    return {
      success: true,
      message
    };
  }

  private async findFile(fileAssetId: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileAssetId }
    });

    if (!file) {
      throw new Error("File asset not found");
    }

    return file;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
