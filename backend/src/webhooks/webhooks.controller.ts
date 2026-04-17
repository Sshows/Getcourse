import { Body, Controller, Headers, Post } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks/video")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("mux")
  receiveMuxWebhook(@Body() payload: Record<string, any>, @Headers("mux-signature") signature?: string) {
    return this.webhooksService.handleMux(payload, signature);
  }

  @Post("cloudflare")
  receiveCloudflareWebhook(
    @Body() payload: Record<string, any>,
    @Headers("webhook-signature") signature?: string
  ) {
    return this.webhooksService.handleCloudflare(payload, signature);
  }
}
