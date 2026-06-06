import { IsEnum, IsNumberString, IsOptional, IsString } from "class-validator";

export enum CatalogSort {
  NEWEST = "newest",
  TOP_RATED = "top_rated",
  TRENDING = "trending",
  PRICE_LOW = "price_low",
  PRICE_HIGH = "price_high"
}

export class CatalogSearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsNumberString()
  minRating?: string;

  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  @IsOptional()
  @IsEnum(CatalogSort)
  sort?: CatalogSort;
}
