import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PipelineStage, Role, DocumentStatus } from '@prisma/client';

const request: typeof supertest = (supertest as any).default ?? supertest;

describe('Phase 3 E2E Validation: Real Scoring Persistence & Workflow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let analystToken: string;
  let managerToken: string;

  let testCounterpartyId: string;
  let testAppId: string;
  let testDocId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Seed test data
    const counterparty = await prisma.counterparty.create({
      data: {
        lei: `TEST-LEI-${Date.now()}`,
        name: 'E2E Test Corp',
        sector: 'Technology',
        internalRating: 'BB',
        riskLevel: 'MED',
      }
    });
    testCounterpartyId = counterparty.id;

    const application = await prisma.application.create({
      data: {
        reqId: `REQ-${Date.now()}`,
        requestedAmount: 15,
        slaDeadline: new Date(),
        currentStage: PipelineStage.SUBMITTED,
        counterpartyId: testCounterpartyId,
      }
    });
    testAppId = application.id;

    const document = await prisma.document.create({
      data: {
        type: 'FINANCIALS',
        name: '2025 Audit.pdf',
        status: DocumentStatus.PENDING_VALIDATION,
        isRequired: true,
        counterpartyId: testCounterpartyId,
        applicationId: testAppId,
      }
    });
    testDocId = document.id;

    // Authenticate
    const resA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'analyst@riskengine.com', password: 'Demo@2026!' });
    analystToken = resA.body.access_token;

    const resM = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@riskengine.com', password: 'Demo@2026!' });
    managerToken = resM.body.access_token;

  }, 60_000);

  afterAll(async () => {
    // Cleanup
    await prisma.alert.deleteMany({ where: { message: { contains: 'TEST' } }});
    await prisma.document.deleteMany({ where: { applicationId: testAppId }});
    await prisma.decision.deleteMany({ where: { applicationId: testAppId }});
    await prisma.application.deleteMany({ where: { id: testAppId }});
    await prisma.counterparty.deleteMany({ where: { id: testCounterpartyId }});
    await app.close();
  });

  it('Flow: Should block scoring if documents are not validated', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/pipeline/${testAppId}/stage`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ stage: 'SCORED' });

    // Assuming your pipeline guard blocks it with 400
    expect([400, 403]).toContain(res.status);
  });

  it('Flow: Document Validation', async () => {
    await request(app.getHttpServer())
      .patch(`/pipeline/documents/${testDocId}/validate`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ comment: 'Looks good' })
      .expect(200); // Or 201

    // Move to COMMITTEE_REVIEW manually to emulate pipeline progression before final decision
    await prisma.application.update({
      where: { id: testAppId },
      data: { currentStage: 'COMMITTEE_REVIEW' }
    });
  });

  it('Flow: Real Scoring & Snapshot Persistence', async () => {
    // Trigger scoring submission
    const res = await request(app.getHttpServer())
      .post(`/decisions/submit/${testAppId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    if (res.status !== 201) {
      console.error('Scoring failed:', res.body);
    }

    expect(res.status).toBe(201);

    expect(res.body.decision).toBeDefined();

    // VERIFY CRITICAL SNAPSHOT FIELDS
    const snapshot = res.body.decision.scoringSnapshot;
    expect(snapshot).toBeDefined();
    expect(snapshot).toHaveProperty('pd');
    expect(snapshot).toHaveProperty('ecl');
    expect(snapshot).toHaveProperty('engine');
    expect(['PYTHON_XGBOOST', 'FALLBACK', 'PYTHON']).toContain(snapshot.engine);
    expect(snapshot).toHaveProperty('modelVersion');
    expect(snapshot).toHaveProperty('inferenceTimestamp');
    expect(snapshot).toHaveProperty('ifrs9Stage');
    expect(snapshot).toHaveProperty('xaiDrivers');
    expect(Array.isArray(snapshot.xaiDrivers)).toBeTruthy();

    // Explicit transparency check
    expect(snapshot).toHaveProperty('imputedFeaturesCount');
    expect(typeof snapshot.imputedFeaturesCount).toBe('number');
  });

  it('Flow: Fallback Audit & Alert Generation', async () => {
    const health = await request(app.getHttpServer())
      .get('/monitoring/scoring-health')
      .set('Authorization', `Bearer ${analystToken}`)
      .expect(200);

    // If Python is offline, we must ensure an alert was generated
    if (health.body.engine === 'FALLBACK') {
      const alertsRes = await request(app.getHttpServer())
        .get('/monitoring/alerts')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);

      const fallbackAlerts = alertsRes.body.filter((a: any) => a.message.includes('FALLBACK Rule Engine'));
      expect(fallbackAlerts.length).toBeGreaterThan(0);
    }
  });

  it('RBAC: Analyst forbidden from overriding ML recommendation', async () => {
    await request(app.getHttpServer())
      .post(`/decisions/submit/${testAppId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ overrideStatus: 'REJECT', overrideReason: 'I think it is bad' })
      .expect(403);
  });
});
