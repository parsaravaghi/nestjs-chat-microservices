import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiGatewayModule } from '../../src/api-gateway.module';
import response from 'supertest';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    // Create a testing module that mirrors the production application.
    const module = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = module.createNestApplication();

    // Initialize the application before executing any test.
    await app.init();
  });

  afterAll(async () => {
    // Close the application and release all resources after the test suite completes.
    await app.close();
  });

  // Generate unique credentials to prevent conflicts between test executions.
  const userInput = {
    username: Math.random().toString(36).slice(2),
    password: '12345678',
    email: `${Math.random().toString(36).slice(2)}@gmail.com`,
  };

  describe('register', () => {
    it('POST /auth/register (should create a new user)', () => {
      response(app.getHttpServer())
        .post('/auth/register')
        .send(userInput)
        .expect(201);
    });

    it('POST /auth/register (should return 409 when the user already exists)', () => {
      response(app.getHttpServer())
        .post('/auth/register')
        .send(userInput)
        .expect(409)
        .expect((res) => {
          // Verify that the correct business error is returned.
          expect(res.body.message).toContain('user duplicate error');

          // Ensure the API follows the standard error response format.
          expect(res.body).toHaveProperty('statusCode');
        });
    });
  });

  describe('login', () => {
    it('POST /auth/login (should return an access token)', () => {
      response(app.getHttpServer())
        .post('/auth/login')
        .send(userInput)
        .expect(201)
        .expect((res) => {
          // Store the JWT for authenticated endpoint tests.
          token = res.body.access_token;

          // Verify that an access token is included in the response.
          expect(res.body).toHaveProperty('access_token');
        });
    });
  });

  describe('me', () => {
    it('GET /auth/me (should return the authenticated user)', () => {
      response(app.getHttpServer())
        .get('/auth/me')
        // Send a valid Bearer token for authentication.
        .set('authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          // Verify that the decoded JWT payload is returned.
          expect(res.body.user).toHaveProperty('sub');
        });
    });

    it('GET /auth/me (should return 401 for an invalid authorization scheme)', () => {
      response(app.getHttpServer())
        .get('/auth/me')
        .set('authorization', `${token}`)
        .expect(401);
    });

    it('GET /auth/me (should return 401 for an invalid access token)', () => {
      response(app.getHttpServer())
        .get('/auth/me')
        .set('authorization', 'random string')
        .expect(401);
    });

    it('GET /auth/me (should return 401 when the authorization header is missing)', () => {
      response(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });
});
