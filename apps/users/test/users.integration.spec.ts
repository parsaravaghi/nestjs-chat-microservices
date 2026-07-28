import { UsersService } from '../src/users.service';
import { Test } from '@nestjs/testing';
import { UsersModule } from '../src/users.module';
import { UserDuplicateException } from '../src/exceptions/userDuplicate.exception';
import { beforeAll, describe, expect, it } from '@jest/globals';

describe('Users (integration)', () => {
  let service: UsersService;

  beforeAll(async () => {
    // Create a testing module using the application's real dependencies.
    const module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    service = module.get(UsersService);
  });

  describe('user creation', () => {
    // Generate unique user data for each test run.
    const user = {
      username: `${Math.random().toString(32).slice(2)}`,
      password: '12345678',
      email: `${Math.random().toString(32).slice(2)}@gmail.com`,
    };

    it('should retun created user', async () => {
      const result = await service.createOne(user);

      // Verify that the persisted user contains the expected data.
      expect(result).toEqual(
        expect.objectContaining({
          username: user.username,
          email: user.email,
        }),
      );

      expect(result.id).toBeDefined();
    });

    it('should throw not acceptable error', async () => {
      // Creating the same user twice should trigger a duplicate user error.
      await expect(service.createOne(user)).rejects.toThrow(
        UserDuplicateException,
      );
    });
  });
});
