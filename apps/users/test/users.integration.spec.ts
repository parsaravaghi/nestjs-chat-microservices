import { beforeAll, describe, expect, it } from '@jest/globals';
import { UsersService } from '../src/users.service';
import { Test } from '@nestjs/testing';
import { UsersModule } from '../src/users.module';
import { NotAcceptableException } from '@nestjs/common';

describe('Users (integration)', () => {
  let service: UsersService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    service = module.get(UsersService);
  });

  describe('user creation', () => {
    const user = {
      username: `${Math.random().toString(32).slice(2)}`,
      password: '12345678',
      email: `${Math.random().toString(32).slice(2)}@gmail.com`,
    };

    it('should retun created user', async () => {
      const result = await service.createOne(user);

      expect(result).toEqual(
        expect.objectContaining({
          username: user.username,
          email: user.email,
        }),
      );

      expect(result.id).toBeDefined();
    });

    it('should throw not acceptable error', async () => {
      await expect(service.createOne(user)).rejects.toThrow(
        NotAcceptableException,
      );
    });
  });
});
