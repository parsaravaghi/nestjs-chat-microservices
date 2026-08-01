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

  // Mock the database repository to isolate service logic from TypeORM.
  const mockedRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  const user = {
    id: 1,
    username: 'parsa',
    password: '1234',
    email: 'test@gmail.com',
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

    // Clear previous mock calls and results to keep tests isolated.
    jest.clearAllMocks();
  });

  describe('user creation', () => {
    it('should return mocked user value', async () => {
      // Mock successful entity creation and database persistence.
      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockReturnValue(user);

      const result = await service.createOne(user);

      expect(result).toBe(user);
    });

    it('should throw duplicate user exception', async () => {
      // Simulate a database duplicate key constraint error.
      const error = new QueryFailedError('user duplicarion error', [], {
        errno: 1062,
      });

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        UserDuplicateException,
      );
    });

    it('should throw unknown database exception', async () => {
      // Simulate an unhandled database error code.
      const error = new QueryFailedError('user duplicarion error', [], {
        errno: 1063,
      });

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(UnknownDbException);
    });

    it('should throw internal server exception', async () => {
      // Simulate an unexpected application-level failure.
      const error = new Error('internal server error');

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        InternalServerException,
      );
    });
  });

  describe('user retrieve', () => {
    it('should return mocked retrieved user', async () => {
      // Mock successful user lookup from the repository.
      mockedRepo.findOneBy.mockReturnValue(user);

      const userData = await service.findOneBy({
        username: user.username,
        email: user.email,
      });

      expect(userData).toBe(user);
    });

    it('should return null when user does not exist', async () => {
      // Verify service behavior when no matching record is found.
      mockedRepo.findOneBy.mockReturnValue(null);

      const userData = await service.findOneBy({
        username: 'test',
        email: 'test@gmail.com',
      });

      expect(userData).toBeFalsy();
    });
  });
});
