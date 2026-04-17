import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateEnrollmentDto {
  @IsString()
  userId!: string;

  @IsString()
  courseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
