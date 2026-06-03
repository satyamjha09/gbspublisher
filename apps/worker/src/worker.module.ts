import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@gbs/database";
import { QueueModule, QUEUES } from "@gbs/queue";
import { FileProcessingProcessor } from "./processors/file-processing.processor";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    QueueModule,
    BullModule.registerQueue({ name: QUEUES.fileProcessing })
  ],
  providers: [FileProcessingProcessor]
})
export class WorkerModule {}
