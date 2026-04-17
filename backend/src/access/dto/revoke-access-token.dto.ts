import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeAccessTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
