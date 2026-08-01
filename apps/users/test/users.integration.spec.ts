import { UsersService } from '../src/users.service';
import { Test } from '@nestjs/testing';
import { UsersModule } from '../src/users.module';
import { UserDuplicateException } from '../src/exceptions/userDuplicate.exception';
import { beforeAll, describe, expect, it } from '@jest/globals';

describe('Users (integration)', () => {
  let service: UsersService;

  // Generate unique test data to prevent conflicts with previous test executions.
  const user = {
    username: `${Math.random().toString(32).slice(2)}`,
    password: '12345678',
    email: `${Math.random().toString(32).slice(2)}@gmail.com`,
  };

  beforeAll(async () => {
    // Load the real module to test service behavior with actual dependencies.
    const module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    service = module.get(UsersService);
  });

  describe('user creation', () => {
    it('should return created user', async () => {
      const result = await service.createOne(user);

      // Ensure the created record contains the expected user information.
      expect(result).toEqual(
        expect.objectContaining({
          username: user.username,
          email: user.email,
        }),
      );

      expect(result.id).toBeDefined();
    });

    it('should throw duplicate user error', async () => {
      // Verify that duplicate records are rejected by the service.
      await expect(service.createOne(user)).rejects.toThrow(
        UserDuplicateException,
      );
    });
  });

  describe('user retrieve', () => {
    it('should return retrieved user', async () => {
      const userData = { username: user.username, email: user.email };

      const result = await service.findOneBy(userData);

      // Verify the retrieved user matches the requested identifier.
      expect(result?.username).toEqual(user.username);
    });

    it('should return null when user does not exist', async () => {
      // Query with random data to verify missing users are handled correctly.
      const result = await service.findOneBy({
        username: Math.random().toString(35).slice(2),
      });

      expect(result).toBeFalsy();
    });
  });
});
