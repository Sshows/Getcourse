import { AccessTokenType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class IssueAccessTokenDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  enrollmentId?: string;

  @IsOptional()
  @IsString()
  issuedById?: string;

  @IsOptional()
  @IsEnum(AccessTokenType)
  tokenType?: AccessTokenType;

  @IsDateString()
  activationExpiresAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
