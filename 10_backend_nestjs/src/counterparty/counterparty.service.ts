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

  async getTopExposures(limit = 5) {
    const all = await this.prisma.counterparty.findMany({
      select: { id: true, name: true, sector: true, exposure: true, pd1y: true, expectedLoss: true, riskLevel: true, ifrs9Stage: true, internalRating: true },
      orderBy: { exposure: 'desc' },
      take: limit,
    });
    const totalExposure = await this.prisma.counterparty.aggregate({ _sum: { exposure: true } });
    const total = totalExposure._sum.exposure ?? 1;
    return all.map(c => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
      exposure: Math.round(c.exposure * 10) / 10,
      pct: Math.round((c.exposure / total) * 1000) / 10,
      pd1y: Math.round(c.pd1y * 10000) / 10000,
      ecl: Math.round(c.expectedLoss * 10) / 10,
      riskLevel: c.riskLevel,
      ifrs9Stage: c.ifrs9Stage,
      internalRating: c.internalRating,
    }));
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
