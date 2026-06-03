import { BookFormat } from "@prisma/client";
import { PartialType } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsISBN, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateEditionDto {
  @IsEnum(BookFormat)
  format!: BookFormat;

  @IsOptional()
  @IsISBN()
  isbn?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99999)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateEditionDto extends PartialType(CreateEditionDto) {}
