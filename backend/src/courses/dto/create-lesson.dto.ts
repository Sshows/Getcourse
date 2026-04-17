import { LessonStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateLessonDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(160)
  slug!: string;

  @IsInt()
  @Min(1)
  position!: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;
}
