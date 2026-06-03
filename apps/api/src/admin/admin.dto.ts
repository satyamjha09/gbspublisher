import { IsString, MaxLength, MinLength } from "class-validator";

export class RejectProjectDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;
}
