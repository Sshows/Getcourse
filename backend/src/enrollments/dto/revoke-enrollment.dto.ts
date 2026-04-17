import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeEnrollmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
