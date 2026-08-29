import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { AuthService } from '../../../apps/auth/src/auth.service';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthModule } from '../../../apps/auth/src/auth.module';
import { RegisterDto } from '@app/constracts';

describe('auth (integration)', () => {
  let service: AuthService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    service = module.get(AuthService);
  });

  afterAll(async () => {
    await module.close();
  });

  const userInput = {
    username: `${Math.random().toString(32).slice(2)}`,
    password: '12345678',
    email: `${Math.random().toString(32).slice(2)}@gmail.com`,
  };
  const registerDto = userInput as RegisterDto;

  describe('register', () => {
    it('should return registered user', async () => {
      const result = await service.register(registerDto);

      expect(result.user.id).toBeTruthy();
    });

    it('should throw an error when registering an existing user', async () => {
      const duplicateDto = {
        username: Math.random().toString(32).slice(2),
        password: '12345678',
        email: `${Math.random().toString(32).slice(2)}@gmail.com`,
      } as RegisterDto;

      await service.register(duplicateDto);

      await expect(service.register(duplicateDto)).rejects.toBeDefined();
    });
  });

  describe('login', () => {
    it('should return a JWT access token', async () => {
      expect(await service.login(userInput)).toHaveProperty('access_token');
    });

    it('should throw unauthorized error when user does not exist', async () => {
      await expect(
        service.login({
          ...userInput,
          username: Math.random().toString(36).slice(2),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw unauthorized error when password is incorrect', async () => {
      await expect(
        service.login({
          ...userInput,
          password: Math.random().toString(36).slice(2),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
