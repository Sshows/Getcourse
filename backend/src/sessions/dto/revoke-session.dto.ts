import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
