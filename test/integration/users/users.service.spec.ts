import { UsersService } from '../../../apps/users/src/users.service';
import { Test } from '@nestjs/testing';
import { UsersModule } from '../../../apps/users/src/users.module';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { TestingModule } from '@nestjs/testing';
import { UserEntity } from '@app/database';
import { QueryFailedError } from 'typeorm';

describe('Users (integration)', () => {
  let service: UsersService;
  let module: TestingModule;

  const user = {
    username: `${Math.random().toString(32).slice(2)}`,
    password: '12345678',
    email: `${Math.random().toString(32).slice(2)}@gmail.com`,
  };
  const userEntity = user as UserEntity;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    service = module.get(UsersService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('user creation', () => {
    it('should return created user', async () => {
      const result = await service.createOne(userEntity);

      expect(result).toEqual(
        expect.objectContaining({
          username: user.username,
          email: user.email,
        }),
      );

      expect(result.id).toBeDefined();
    });

    it('should propagate duplicate persistence errors to the filter', async () => {
      await expect(service.createOne(userEntity)).rejects.toThrow(
        QueryFailedError,
      );
    });
  });

  describe('user retrieve', () => {
    it('should return retrieved user', async () => {
      const userData = { username: user.username, email: user.email };

      const result = await service.findOneBy(userData);

      expect(result?.username).toEqual(user.username);
    });

    it('should return null when user does not exist', async () => {
      const result = await service.findOneBy({
        username: Math.random().toString(35).slice(2),
      });

      expect(result).toBeFalsy();
    });
  });
});
