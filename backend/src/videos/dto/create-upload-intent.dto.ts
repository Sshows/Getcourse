import { VideoProvider } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateUploadIntentDto {
  @IsString()
  lessonId!: string;

  @IsOptional()
  @IsEnum(VideoProvider)
  provider?: VideoProvider;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sizeBytes?: number;
}
