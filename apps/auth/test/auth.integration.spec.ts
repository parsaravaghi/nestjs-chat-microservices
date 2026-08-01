import { beforeAll, describe, expect, it } from '@jest/globals';
import { AuthService } from '../src/auth.service';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../src/auth.module';
import { UnautorizedRpcException } from '../src/exceptions/unauthorized.exception';

describe('auth (integration)', () => {
  let service: AuthService;

  beforeAll(async () => {
    // Initialize the real application module to test actual service dependencies.
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    service = module.get(AuthService);
  });

  // Generate unique credentials to prevent conflicts between test executions.
  const userInput = {
    username: `${Math.random().toString(32).slice(2)}`,
    password: '12345678',
    email: `${Math.random().toString(32).slice(2)}@gmail.com`,
  };

  describe('register', () => {
    it('should return registered user', async () => {
      const result = await service.register(userInput);

      // Ensure the created user contains a generated database identifier.
      expect(result.user.id).toBeTruthy();
    });

    it('should throw an error when registering an existing user', async () => {
      // Verify duplicate user creation is handled correctly.
      await expect(service.register(userInput)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should return a JWT access token', async () => {
      // Verify successful authentication generates a valid token response.
      expect(await service.login(userInput)).toHaveProperty('access_token');
    });

    it('should throw unauthorized error when user does not exist', async () => {
      // Verify authentication fails for unknown users.
      await expect(
        service.login({
          ...userInput,
          username: Math.random().toString(36).slice(2),
        }),
      ).rejects.toThrow(UnautorizedRpcException);
    });

    it('should throw unauthorized error when password is incorrect', async () => {
      // Verify authentication fails when password validation does not pass.
      await expect(
        service.login({
          ...userInput,
          password: Math.random().toString(36).slice(2),
        }),
      ).rejects.toThrow(UnautorizedRpcException);
    });
  });
});
