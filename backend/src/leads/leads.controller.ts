import { Body, Controller, Get, Post } from "@nestjs/common";
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
  listLeads() {
    return this.leadsService.listLeads();
  }
}
