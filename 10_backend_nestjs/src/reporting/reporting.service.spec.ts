import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../prisma/prisma.service';

const mockCounterparties = [
  {
    id: 'cp-001', name: 'Société Générale CEMAC', lei: 'LEI001', sector: 'BANKING',
    internalRating: 'A', riskLevel: 'LOW', ifrs9Stage: 'STAGE_1',
    pd1y: 0.005, exposure: 120.5, expectedLoss: 0.6025, watchlistFlag: false,
  },
  {
    id: 'cp-002', name: 'Agro Industries SA', lei: 'LEI002', sector: 'AGRICULTURE',
    internalRating: 'B', riskLevel: 'MED', ifrs9Stage: 'STAGE_2',
    pd1y: 0.04, exposure: 85.0, expectedLoss: 3.4, watchlistFlag: true,
  },
  {
    id: 'cp-003', name: 'Transport Express', lei: 'LEI003', sector: 'TRANSPORT',
    internalRating: 'C', riskLevel: 'HIGH', ifrs9Stage: 'STAGE_3',
    pd1y: 0.18, exposure: 22.0, expectedLoss: 11.0, watchlistFlag: true,
  },
  {
    id: 'cp-004', name: 'Telecom BEAC', lei: null, sector: 'TELECOM',
    internalRating: 'AA', riskLevel: 'CRITICAL', ifrs9Stage: 'STAGE_1',
    pd1y: 0.002, exposure: 200.0, expectedLoss: 0.4, watchlistFlag: false,
  },
];

const mockDecisions = [
  { scoringSnapshot: {}, counterpartyId: 'cp-001' },
];

const mockPrisma = {
  counterparty: {
    findMany: jest.fn().mockResolvedValue(mockCounterparties),
  },
  decision: {
    findMany: jest.fn().mockResolvedValue(mockDecisions),
  },
};

describe('ReportingService', () => {
  let service: ReportingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    jest.clearAllMocks();
    mockPrisma.counterparty.findMany.mockResolvedValue(mockCounterparties);
    mockPrisma.decision.findMany.mockResolvedValue(mockDecisions);
  });

  it('should return a Buffer', async () => {
    const result = await service.generateIfrs9CobacReport();
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should generate valid SpreadsheetML XML', async () => {
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('progid="Excel.Sheet"');
    expect(xml).toContain('<Workbook');
    expect(xml).toContain('</Workbook>');
  });

  it('should include all 5 worksheet tabs', async () => {
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('ss:Name="Cover"');
    expect(xml).toContain('IFRS 9');
    expect(xml).toContain('ECL par Secteur');
    expect(xml).toContain('Top 20 Expositions');
    expect(xml).toContain('RWA');
  });

  it('should include IFRS 9 stage data in staging sheet', async () => {
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('STAGE_1');
    expect(xml).toContain('STAGE_2');
    expect(xml).toContain('STAGE_3');
    expect(xml).toContain('TOTAL PORTEFEUILLE');
  });

  it('should include sector names in sector sheet', async () => {
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('BANKING');
    expect(xml).toContain('AGRICULTURE');
    expect(xml).toContain('TRANSPORT');
  });

  it('should include RWA Basel III risk levels', async () => {
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('LOW');
    expect(xml).toContain('MED');
    expect(xml).toContain('HIGH');
    expect(xml).toContain('CRITICAL');
    expect(xml).toContain('CET1');
  });

  it('should mark watchlist counterparties in top exposures', async () => {
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('OUI');
  });

  it('should handle empty counterparty list gracefully', async () => {
    mockPrisma.counterparty.findMany.mockResolvedValue([]);
    mockPrisma.decision.findMany.mockResolvedValue([]);
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('<Workbook');
    expect(xml).toContain('TOTAL PORTEFEUILLE');
  });

  it('should include confidentiality notice on cover sheet', async () => {
    const result = await service.generateIfrs9CobacReport();
    const xml = result.toString('utf-8');
    expect(xml).toContain('Document confidentiel');
    expect(xml).toContain('COBAC');
  });
});
