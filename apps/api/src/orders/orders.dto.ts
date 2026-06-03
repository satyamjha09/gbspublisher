import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateCheckoutDto {
  @IsString()
  editionId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  quantity?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
