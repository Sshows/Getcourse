import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AdminSessionGuard } from "../admin-auth/admin-session.guard";
import { ActivateAccessTokenDto } from "./dto/activate-access-token.dto";
import { IssueAccessTokenDto } from "./dto/issue-access-token.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RevokeAccessTokenDto } from "./dto/revoke-access-token.dto";
import { AccessService } from "./access.service";

@Controller()
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get("admin/tokens")
  @UseGuards(AdminSessionGuard)
  listTokens() {
    return this.accessService.listTokens();
  }

  @Post("admin/tokens/issue")
  @UseGuards(AdminSessionGuard)
  issueToken(@Body() dto: IssueAccessTokenDto, @Req() request: any) {
    return this.accessService.issueToken({
      ...dto,
      issuedById: request.adminUser.id
    });
  }

  @Patch("admin/tokens/:tokenId/revoke")
  @UseGuards(AdminSessionGuard)
  revokeToken(@Param("tokenId") tokenId: string, @Body() dto: RevokeAccessTokenDto, @Req() request: any) {
    return this.accessService.revokeToken(tokenId, dto.reason, request.adminUser.id);
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
