import { beforeAll, describe, expect, it } from '@jest/globals';
import { AuthService } from '../src/auth.service';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../src/auth.module';

describe('auth (integration)', () => {
  let service: AuthService;

  beforeAll(async () => {
    // Create the testing module with the actual AuthModule dependencies.
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    // Use unique user data so repeated test executions don't conflict.
    const userInput = {
      username: `${Math.random().toString(32).slice(2)}`,
      password: '12345678',
      email: `${Math.random().toString(32).slice(2)}@gmail.com`,
    };

    it('should return registerd user', async () => {
      const result = await service.register(userInput);

      // A successful registration should generate a persisted user ID.
      expect(result.id).toBeTruthy();
    });

    it('should return registerd user', async () => {
      // The second registration should fail because the user already exists.
      await expect(service.register(userInput)).rejects.toThrow();
    });
  });
});
