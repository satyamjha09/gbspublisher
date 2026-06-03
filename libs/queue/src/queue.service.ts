import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import { QUEUES } from "./queue.constants";

export type FileProcessingJobName = "scan-file" | "validate-manuscript" | "validate-cover" | "generate-preview";

export type FileProcessingJobData = {
  fileAssetId: string;
  ownerId: string;
  projectId?: string | null;
};

@Injectable()
export class QueueService {
  constructor(@InjectQueue(QUEUES.fileProcessing) private readonly fileProcessingQueue: Queue) {}

  addFileProcessingJob(name: FileProcessingJobName, data: FileProcessingJobData) {
    return this.fileProcessingQueue.add(name, data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: {
        age: 60 * 60 * 24,
        count: 1000
      },
      removeOnFail: {
        age: 60 * 60 * 24 * 7
      }
    });
  }
}
