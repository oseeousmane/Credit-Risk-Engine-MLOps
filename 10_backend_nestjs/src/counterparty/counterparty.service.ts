import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CounterpartyQueryDto } from '../common/dto/query.dto';
import { paginate } from '../common/pagination';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CounterpartyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: CounterpartyQueryDto) {
    const { page = 1, limit = 20, search, sector, riskLevel, ifrs9Stage, sortBy = 'exposure', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lei: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (sector) where.sector = { equals: sector, mode: 'insensitive' };
    if (riskLevel) where.riskLevel = riskLevel;
    if (ifrs9Stage) where.ifrs9Stage = ifrs9Stage;

    const [data, total] = await Promise.all([
      this.prisma.counterparty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { analyst: { select: { name: true, email: true } } },
      }),
      this.prisma.counterparty.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.prisma.counterparty.findUniqueOrThrow({
      where: { id },
      include: {
        analyst: { select: { id: true, name: true, email: true, role: true } },
        exposures: true,
        applications: { orderBy: { createdAt: 'desc' }, take: 5 },
        decisions: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
  }

  async getPortfolioKpis() {
    const counterparties = await this.prisma.counterparty.findMany({
      select: { exposure: true, pd1y: true, expectedLoss: true, riskLevel: true, watchlistFlag: true, ifrs9Stage: true },
    });
    const totalCount = counterparties.length;

    const totalExposure = counterparties.reduce((s, c) => s + c.exposure, 0);
    const avgPD = totalCount > 0
      ? counterparties.reduce((s, c) => s + c.pd1y, 0) / totalCount
      : 0;
    const watchlistEntities = counterparties.filter(c => c.watchlistFlag).length;
    const totalEL = counterparties.reduce((s, c) => s + c.expectedLoss, 0);

    const stage1Count = counterparties.filter(c => c.ifrs9Stage === 'STAGE_1').length;
    const stage2Count = counterparties.filter(c => c.ifrs9Stage === 'STAGE_2').length;
    const stage3Count = counterparties.filter(c => c.ifrs9Stage === 'STAGE_3').length;

    return {
      totalExposure: Math.round(totalExposure * 10) / 10,
      avgPD: Math.round(avgPD * 10000) / 10000,
      watchlistEntities,
      totalEL: Math.round(totalEL * 10) / 10,
      totalCounterparties: totalCount,
      stage1Pct: totalCount ? (stage1Count / totalCount) * 100 : 0,
      stage2Pct: totalCount ? (stage2Count / totalCount) * 100 : 0,
      stage3Pct: totalCount ? (stage3Count / totalCount) * 100 : 0,
    };
  }
}
