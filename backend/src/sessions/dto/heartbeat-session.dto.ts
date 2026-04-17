import { IsNotEmpty, IsString } from "class-validator";

export class HeartbeatSessionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}
