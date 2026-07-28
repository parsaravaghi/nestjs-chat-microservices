import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiGatewayModule } from '../../src/api-gateway.module';
import response from 'supertest';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create a testing application with the same configuration as production.
    const module = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = module.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    // Release resources and close open connections after all tests finish.
    await app.close();
  });

  // Generate unique user data to avoid conflicts between test runs.
  const userInput = {
    username: `${Math.random().toString(36).slice(2)}`,
    password: '12345678',
    email: `${Math.random().toString(36).slice(2)}@gmail.com`,
  };

  describe('register', () => {
    it('Post /auth/register (should response created user)', () => {
      response(app.getHttpServer())
        .post('/auth/register')
        .send(userInput)
        .expect(201);
    });

    it('Post /auth/register (should respone error message)', () => {
      response(app.getHttpServer())
        .post('/auth/register')
        .send(userInput)
        .expect(409)
        .expect((res) => {
          // Verify that the API returns the expected business error.
          expect(res.body.message).toContain('user duplicate error');

          // Ensure the standardized error response format is preserved.
          expect(res.body).toHaveProperty('statusCode');
        });
    });
  });
});