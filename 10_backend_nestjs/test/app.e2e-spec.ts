import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';

// Compatibility shim: supertest may be a CJS module with a .default property
// when compiled under commonjs moduleResolution via ts-jest
const request: typeof supertest = (supertest as any).default ?? supertest;

/**
 * E2E Tests â€” Critical Platform Flows
 *
 * Run with: npm run test:e2e
 *
 * Covers:
 * 1. Auth â€” login / reject / token isolation
 * 2. RBAC â€” internal vs client role separation (401 / 403)
 * 3. Monitoring â€” scoring health & metrics history endpoints
 * 4. Auth migration status endpoint
 */
describe('Risk Engine â€” E2E Critical Flows', () => {
  let app: INestApplication;
  let analystToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. Auth Flow
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('POST /auth/login', () => {
    it('should authenticate internal analyst and return JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'analyst@riskengine.com', password: 'Demo@2026!' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.user.role).toBe('ANALYST');
      analystToken = res.body.access_token;
    });

    it('should reject login with wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'analyst@riskengine.com', password: 'WRONG_PASSWORD' })
        .expect(401);
    });

    it('should reject login with unknown email (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Demo@2026!' })
        .expect(401);
    });

    it('should reject login with missing password (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'analyst@riskengine.com' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile when authenticated', async () => {
      if (!analystToken) return;

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);

      expect(res.body.email).toBe('analyst@riskengine.com');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 2. RBAC â€” Client Portal Isolation
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('Client Portal â€” RBAC Access Isolation', () => {
    it('should allow ANALYST to access internal /counterparties endpoint (200)', async () => {
      if (!analystToken) return;

      const res = await request(app.getHttpServer())
        .get('/counterparties')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data ?? res.body)).toBeTruthy();
    });

    it('/client/applications should reject unauthenticated requests (401)', async () => {
      await request(app.getHttpServer())
        .get('/client/applications')
        .expect(401);
    });

    it('ANALYST should be FORBIDDEN from /client/applications (403) â€” role isolation', async () => {
      if (!analystToken) return;

      await request(app.getHttpServer())
        .get('/client/applications')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(403);
    });

    it('/pipeline without token should be rejected (401)', async () => {
      await request(app.getHttpServer())
        .get('/pipeline')
        .expect(401);
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 3. Monitoring â€” Scoring Health
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('GET /monitoring/scoring-health', () => {
    it('should return scoring engine status with required fields', async () => {
      if (!analystToken) return;

      const res = await request(app.getHttpServer())
        .get('/monitoring/scoring-health')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('engine');
      expect(['PYTHON', 'FALLBACK']).toContain(res.body.engine);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('latencyMs');
      expect(typeof res.body.latencyMs).toBe('number');
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 4. Monitoring â€” Historical metrics endpoint
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('GET /monitoring/metrics/history', () => {
    it('should return an array of historical metric entries', async () => {
      if (!analystToken) return;

      const res = await request(app.getHttpServer())
        .get('/monitoring/metrics/history?limit=5')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('loggedAt');
        expect(res.body[0]).toHaveProperty('auc');
      }
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 5. Auth â€” Migration Status
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('GET /auth/migration-status', () => {
    it('should return migration status with total/legacy/migrated/bridgeSafeToRemove', async () => {
      if (!analystToken) return;

      const res = await request(app.getHttpServer())
        .get('/auth/migration-status')
        .set('Authorization', `Bearer ${analystToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('legacy');
      expect(res.body).toHaveProperty('migrated');
      expect(res.body).toHaveProperty('bridgeSafeToRemove');
      expect(typeof res.body.migrationComplete).toBe('boolean');
    });
  });
});
