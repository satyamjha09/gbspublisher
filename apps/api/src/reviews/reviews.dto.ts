import { ReviewStatus } from "@prisma/client";
import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsBoolean()
  spoilerFlag?: boolean;

  @IsOptional()
  @IsString()
  editionId?: string;
}

export class UpdateReviewDto extends PartialType(CreateReviewDto) {}

export class ModerateReviewDto {
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
