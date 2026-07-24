import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UsersService } from '../src/users.service';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from '@app/database';
import { QueryFailedError } from 'typeorm';
import { BadRequestException, InternalServerErrorException, NotAcceptableException } from '@nestjs/common';

describe('Users (unit)', () => {
  let service: UsersService;
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
  });

  describe('user creation', () => {
    const user = {
      id: 1,
      username: 'parsa',
      password: '1234',
      email: 'test@gmail.com',
    };

    it('should return mocked user value', async () => {
      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockReturnValue(user);

      const result = await service.createOne(user);

      expect(result).toBe(user);
    });

    it('should throw not acceptable error', async () => {
      const error = new QueryFailedError('user duplicarion error', [], {
        errno: 1062,
      });

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        NotAcceptableException,
      );
    });

    it('should throw not acceptable error', async () => {
      const error = new QueryFailedError('user duplicarion error', [], {
        errno: 1062,
      });

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        NotAcceptableException,
      );
    });

    it('should throw bad request error', async () => {
      const error = new QueryFailedError('user duplicarion error', [], {
        errno: 1063,
      });

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw bad request error', async () => {
      const error = new Error('internal server error');

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error);

      await expect(service.createOne(user)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
