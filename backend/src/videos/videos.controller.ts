import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateUploadIntentDto } from "./dto/create-upload-intent.dto";
import { VideosService } from "./videos.service";

@Controller("admin/videos")
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get("assets")
  listAssets() {
    return this.videosService.listAssets();
  }

  @Post("upload-intents")
  createUploadIntent(@Body() dto: CreateUploadIntentDto) {
    return this.videosService.createUploadIntent(dto);
  }
}
