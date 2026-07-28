import { UsersService } from '../src/users.service';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '@app/database';
import { QueryFailedError } from 'typeorm';
import { UserDuplicateException } from '../src/exceptions/userDuplicate.exception';
import { InternalServerException, UnknownDbException } from '@app/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('Users (unit)', () => {
  let service: UsersService;

  // Mock the UserEntity repository.
  const mockedRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockedRepo,
        },
      ],
    }).compile();

    service = module.get(UsersService);

    // Reset mock state before each test.
    jest.clearAllMocks();
  });

  describe('user creation', () => {
    const user = {
      id: 1,
      username: 'parsa',
      password: '1234',
      email: 'test@gmail.com',
    };

    it('should return mocked user value', async () => {
      // Mock a successful repository operation.
      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockReturnValue(user);

      const result = await service.createOne(user);

      expect(result).toBe(user);
    });

    it('should throw not acceptable error', async () => {
      // Simulate MySQL duplicate key error (errno 1062).
      const error = new QueryFailedError('user duplicarion error', [], {
        errno: 1062,
      });

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        UserDuplicateException,
      );
    });

    it('should throw bad request error', async () => {
      // Simulate an unknown database error.
      const error = new QueryFailedError('user duplicarion error', [], {
        errno: 1063,
      });

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(UnknownDbException);
    });

    it('should throw bad request error', async () => {
      // Simulate a non-database error.
      const error = new Error('internal server error');

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        InternalServerException,
      );
    });
  });
});
