import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  buildObjectKey(parts: string[]): string {
    return parts.map((part) => part.replace(/^\/+|\/+$/g, "")).join("/");
  }

  getBucketName(): string {
    return this.config.getOrThrow<string>("S3_BUCKET");
  }
}
