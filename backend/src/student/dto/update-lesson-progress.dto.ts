import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from "class-validator";

export class UpdateLessonProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent!: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  lastPositionSeconds?: number;
}
