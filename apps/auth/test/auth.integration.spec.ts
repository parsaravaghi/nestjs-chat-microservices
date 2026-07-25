import { beforeAll, describe, expect, it } from '@jest/globals';
import { AuthService } from '../src/auth.service';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../src/auth.module';

describe('auth (integration)', () => {
  let service: AuthService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    const userInput = {
      username: `${Math.random().toString(32).slice(2)}`,
      password: '12345678',
      email: `${Math.random().toString(32).slice(2)}@gmail.com`,
    };

    it('should return registerd user', async () => {
      const result = await service.register(userInput);

      expect(result.id).toBeTruthy();
    });

    it('should return registerd user', async () => {
      await expect(service.register(userInput)).rejects.toThrow();
    });
  });
});
