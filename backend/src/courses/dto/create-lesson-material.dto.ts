import { MaterialType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateLessonMaterialDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsEnum(MaterialType)
  type!: MaterialType;

  @IsInt()
  @Min(1)
  position!: number;

  @IsOptional()
  @IsString()
  contentText?: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
