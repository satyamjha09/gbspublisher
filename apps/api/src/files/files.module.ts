import { S3Client } from "@aws-sdk/client-s3";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QueueModule } from "@gbs/queue";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

export const S3_CLIENT = "S3_CLIENT";

@Module({
  imports: [ConfigModule, QueueModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          endpoint: config.get<string>("S3_ENDPOINT"),
          region: config.get<string>("S3_REGION", "us-east-1"),
          forcePathStyle: config.get<string>("S3_FORCE_PATH_STYLE", "true") === "true",
          credentials: {
            accessKeyId: config.getOrThrow<string>("S3_ACCESS_KEY"),
            secretAccessKey: config.getOrThrow<string>("S3_SECRET_KEY")
          }
        })
    }
  ],
  exports: [FilesService]
})
export class FilesModule {}
