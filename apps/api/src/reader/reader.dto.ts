import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateProgressDto {
  @IsOptional()
  @IsString()
  currentLocator?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}

export class CreateBookmarkDto {
  @IsString()
  @MaxLength(500)
  locator!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreateHighlightDto {
  @IsString()
  @MaxLength(500)
  locatorStart!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locatorEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  textSnippet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
