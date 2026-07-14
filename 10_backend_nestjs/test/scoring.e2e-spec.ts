import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';

const request: typeof supertest = (supertest as any).default ?? supertest;

describe('Scoring & Circuit Breaker (e2e)', () => {
  let app: INestApplication;
  let analystToken: string;
  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    originalFetch = global.fetch;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Authenticate
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'analyst@riskengine.com', password: 'Demo@2026!' });
    analystToken = res.body.access_token;
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });

  it('should fallback to rule engine when Python ML API fails', async () => {
    // Mock fetch to simulate a crash/timeout of the Python ML engine
    global.fetch = jest.fn(() => Promise.reject(new Error('Connection refused (mocked)')));

    // First request: hits fetch, fails, falls back
    const res1 = await request(app.getHttpServer())
      .post('/scoring/adhoc')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ pdCurrent: 4.0, exposure: 10, riskLevel: 'MED' })
      .expect(201);

    expect(res1.body.engine).toBe('FALLBACK');
    expect(res1.body.scoredBy).toBe('RULE_ENGINE');
    
    // Second request
    await request(app.getHttpServer())
      .post('/scoring/adhoc')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ pdCurrent: 4.0, exposure: 10, riskLevel: 'MED' });

    // Third request: Trips the circuit breaker (threshold = 3)
    await request(app.getHttpServer())
      .post('/scoring/adhoc')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ pdCurrent: 4.0, exposure: 10, riskLevel: 'MED' });

    const fetchSpy = global.fetch as jest.Mock;
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Fourth request: Circuit is OPEN, fetch should NOT be called at all
    const res4 = await request(app.getHttpServer())
      .post('/scoring/adhoc')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ pdCurrent: 4.0, exposure: 10, riskLevel: 'MED' })
      .expect(201);

    expect(res4.body.engine).toBe('FALLBACK');
    expect(res4.body.scoredBy).toBe('RULE_ENGINE');
    
    // The number of calls to fetch should remain 3, proving the Circuit Breaker blocked traffic
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
