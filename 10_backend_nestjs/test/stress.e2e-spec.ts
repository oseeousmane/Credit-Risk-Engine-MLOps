import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from './../src/app.module';

// Compatibility shim for CJS/ESM supertest resolution under ts-jest commonjs
const request: typeof supertest = (supertest as any).default ?? supertest;

describe('StressTestingController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'analyst@riskengine.com', password: 'Demo@2026!' });
    token = res.body.access_token;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('/scenarios/run (POST) - Execute severe macro scenario', async () => {
    const payload = {
      unemploymentShock: 2.0,
      creditSpreadBps: 200,
      realGDPGrowth: -1.5,
      inflationDelta: 3.0,
      horizon: '1Y',
    };

    const response = await request(app.getHttpServer())
      .post('/scenarios/run')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body.summary).toBeDefined();
    expect(response.body.summary.severe).toBeDefined();

    // Basic sanity: if we apply a shock, severe EL > baseline EL
    expect(response.body.summary.severe.totalEL).toBeGreaterThan(
      response.body.summary.baseline.totalEL
    );
    expect(response.body.scenarioId).toBeDefined();
  });
});
