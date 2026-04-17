import { Injectable } from "@nestjs/common";
import { AuditActorType, AuditEventType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSiteLeadDto } from "./dto/create-site-lead.dto";

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async createLead(dto: CreateSiteLeadDto) {
    const lead = await this.prisma.siteLead.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone,
        company: dto.company,
        message: dto.message,
        source: dto.source || "public_site"
      }
    });

    await this.auditService.record({
      actorType: AuditActorType.ANONYMOUS,
      eventType: AuditEventType.SITE_LEAD_CREATED,
      entityType: "site_lead",
      entityId: lead.id,
      metadata: {
        source: lead.source
      }
    });

    return lead;
  }

  async listLeads() {
    return this.prisma.siteLead.findMany({
      orderBy: { createdAt: "desc" }
    });
  }
}
