import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QUEUES } from "./queue.constants";
import { QueueService } from "./queue.service";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("REDIS_HOST", "localhost"),
          port: Number(config.get<string>("REDIS_PORT", "6379"))
        }
      })
    }),
    BullModule.registerQueue({
      name: QUEUES.fileProcessing
    })
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService]
})
export class QueueModule {}
