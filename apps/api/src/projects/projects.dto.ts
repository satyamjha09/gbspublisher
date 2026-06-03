import { FileAssetType } from "@prisma/client";
import { PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ageRating?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  coverFileId?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class RegisterFileAssetDto {
  @IsEnum(FileAssetType)
  type!: FileAssetType;

  @IsString()
  originalName!: string;

  @IsString()
  storageKey!: string;

  @IsMimeType()
  mimeType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  checksum?: string;
}
