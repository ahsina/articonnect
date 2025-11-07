import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('ArtiConnect E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication (Auth Module)', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'CLIENT',
    };

    it('/auth/register (POST) - should register new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe(testUser.email);
          authToken = res.body.accessToken;
          userId = res.body.user.id;
        });
    });

    it('/auth/register (POST) - should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('/auth/login (POST) - should login user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('/auth/login (POST) - should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('/auth/me (POST) - should get current user', () => {
      return request(app.getHttpServer())
        .post('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe(userId);
          expect(res.body.email).toBe(testUser.email);
        });
    });

    it('/auth/me (POST) - should fail without token', () => {
      return request(app.getHttpServer())
        .post('/auth/me')
        .expect(401);
    });
  });

  describe('Users (User Module)', () => {
    it('/users/profile (GET) - should get user profile', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('clientProfile');
        });
    });

    it('/users/profile (PUT) - should update profile', () => {
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('Updated');
          expect(res.body.lastName).toBe('Name');
        });
    });

    it('/users/artisans (GET) - should get list of artisans', () => {
      return request(app.getHttpServer())
        .get('/users/artisans')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Missions (Mission Module)', () => {
    let missionId: string;

    const testMission = {
      type: 'SCHEDULED',
      title: 'Test mission',
      description: 'This is a test mission',
      category: 'Plomberie',
      address: '15 Rue de la Gare',
      city: 'Luxembourg',
      postalCode: '1234',
      country: 'LU',
      latitude: 49.6116,
      longitude: 6.1319,
      clientBudget: 150,
    };

    it('/missions (POST) - should create new mission', () => {
      return request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testMission)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe(testMission.title);
          expect(res.body.status).toBe('PENDING');
          expect(res.body.vatRate).toBe(17); // Luxembourg VAT
          missionId = res.body.id;
        });
    });

    it('/missions (GET) - should get all missions', () => {
      return request(app.getHttpServer())
        .get('/missions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('/missions/:id (GET) - should get mission by id', () => {
      return request(app.getHttpServer())
        .get(`/missions/${missionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(missionId);
          expect(res.body.title).toBe(testMission.title);
        });
    });

    it('/missions/nearby (GET) - should get nearby missions', () => {
      return request(app.getHttpServer())
        .get('/missions/nearby?lat=49.6116&lng=6.1319&radius=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Marketplace (Marketplace Module)', () => {
    it('/marketplace/products (GET) - should get products', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/marketplace/products?category=Plomberie (GET) - should filter by category', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products?category=Plomberie')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Geolocation (Geo Module)', () => {
    it('/geo/nearby (GET) - should find nearby artisans', () => {
      return request(app.getHttpServer())
        .get('/geo/nearby?lat=49.6116&lng=6.1319&radius=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Security Tests', () => {
    it('should reject requests without authentication', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });

    it('should reject invalid JWT token', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should validate input data', () => {
      return request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          title: 'Test',
        })
        .expect(400);
    });
  });
});
