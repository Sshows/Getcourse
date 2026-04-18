import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AdminSessionGuard } from "../admin-auth/admin-session.guard";
import { CreateSiteLeadDto } from "./dto/create-site-lead.dto";
import { LeadsService } from "./leads.service";

@Controller()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post("public/leads")
  createLead(@Body() dto: CreateSiteLeadDto) {
    return this.leadsService.createLead(dto);
  }

  @Get("admin/leads")
  @UseGuards(AdminSessionGuard)
  listLeads() {
    return this.leadsService.listLeads();
  }
}
