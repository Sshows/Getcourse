import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class ActivateAccessTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  deviceFingerprint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  deviceLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}
