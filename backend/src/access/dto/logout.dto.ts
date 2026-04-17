import { IsString } from "class-validator";

export class LogoutDto {
  @IsString()
  userId!: string;

  @IsString()
  sessionId!: string;
}
