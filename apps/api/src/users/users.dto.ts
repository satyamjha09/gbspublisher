import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpsertUserDto {
  @IsString()
  clerkId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
