import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiGatewayModule } from '../../../apps/api-gateway/src/api-gateway.module';
import { RpcInterceptor } from '../../../apps/api-gateway/src/common/interceptors/rpc.interceptor';
import response from 'supertest';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let httpServer: Parameters<typeof response>[0];
  let token: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalInterceptors(new RpcInterceptor());

    await app.init();
    httpServer = app.getHttpServer() as Parameters<typeof response>[0];
  });

  afterAll(async () => {
    await app.close();
  });

  const userInput = {
    username: Math.random().toString(36).slice(2),
    password: '12345678',
    email: `${Math.random().toString(36).slice(2)}@gmail.com`,
  };

  describe('register', () => {
    it('POST /auth/register (should create a new user)', async () => {
      await response(httpServer)
        .post('/auth/register')
        .send(userInput)
        .expect(201);
    });

    it('POST /auth/register (should return 409 when the user already exists)', async () => {
      await response(httpServer)
        .post('/auth/register')
        .send(userInput)
        .expect(409)
        .expect((res) => {
          const body = res.body as { message: string; statusCode: number };

          expect(body.message).toContain('user duplicate error');

          expect(body).toHaveProperty('statusCode');
        });
    });
  });

  describe('login', () => {
    it('POST /auth/login (should return an access token)', async () => {
      await response(httpServer)
        .post('/auth/login')
        .send(userInput)
        .expect(201)
        .expect((res) => {
          const body = res.body as { access_token: string };

          token = body.access_token;

          expect(body).toHaveProperty('access_token');
        });
    });
  });

  describe('me', () => {
    it('GET /auth/me (should return the authenticated user)', async () => {
      await response(httpServer)
        .get('/auth/me')
        .set('authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as { user: { sub: string } };

          expect(body.user).toHaveProperty('sub');
        });
    });

    it('GET /auth/me (should return 401 for an invalid authorization scheme)', async () => {
      await response(httpServer)
        .get('/auth/me')
        .set('authorization', `${token}`)
        .expect(401);
    });

    it('GET /auth/me (should return 401 for an invalid access token)', async () => {
      await response(httpServer)
        .get('/auth/me')
        .set('authorization', 'random string')
        .expect(401);
    });

    it('GET /auth/me (should return 401 when the authorization header is missing)', async () => {
      await response(httpServer).get('/auth/me').expect(401);
    });
  });
});
