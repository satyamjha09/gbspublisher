import { FileAssetType } from "@prisma/client";
import { IsEnum, IsInt, IsMimeType, IsOptional, IsString, Min } from "class-validator";

export class CreateUploadDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsEnum(FileAssetType)
  type!: FileAssetType;

  @IsString()
  originalName!: string;

  @IsMimeType()
  mimeType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

export class CompleteUploadDto {
  @IsOptional()
  @IsString()
  checksum?: string;
}
