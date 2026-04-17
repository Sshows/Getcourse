import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ActivateAccessTokenDto } from "./dto/activate-access-token.dto";
import { IssueAccessTokenDto } from "./dto/issue-access-token.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RevokeAccessTokenDto } from "./dto/revoke-access-token.dto";
import { AccessService } from "./access.service";

@Controller()
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get("admin/tokens")
  listTokens() {
    return this.accessService.listTokens();
  }

  @Post("admin/tokens/issue")
  issueToken(@Body() dto: IssueAccessTokenDto) {
    return this.accessService.issueToken(dto);
  }

  @Patch("admin/tokens/:tokenId/revoke")
  revokeToken(@Param("tokenId") tokenId: string, @Body() dto: RevokeAccessTokenDto) {
    return this.accessService.revokeToken(tokenId, dto.reason);
  }

  @Post("auth/activate")
  activate(@Body() dto: ActivateAccessTokenDto) {
    return this.accessService.activateToken(dto);
  }

  @Post("auth/logout")
  logout(@Body() dto: LogoutDto) {
    return this.accessService.logout(dto.userId, dto.sessionId);
  }
}
