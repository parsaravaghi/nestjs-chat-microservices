import { UsersService } from '../../../apps/users/src/users.service';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity, UserRole } from '@app/database';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('Users (unit)', () => {
  let service: UsersService;

  const mockedRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  const user = {
    id: 'user-id',
    username: 'parsa',
    password: '1234',
    email: 'test@gmail.com',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
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

    jest.clearAllMocks();
  });

  describe('user creation', () => {
    it('should return mocked user value', async () => {
      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockReturnValue(user);

      const result = await service.createOne(user);

      expect(result).toBe(user);
    });

    it('lets persistence errors reach the exception layer unchanged', async () => {
      const error = new Error('persistence failed');

      mockedRepo.create.mockReturnValue(user);
      mockedRepo.save.mockRejectedValue(error as never);

      await expect(service.createOne(user)).rejects.toBe(error);
    });
  });

  describe('user retrieve', () => {
    it('should return mocked retrieved user', async () => {
      mockedRepo.findOneBy.mockReturnValue(user);

      const userData = await service.findOneBy({
        username: user.username,
        email: user.email,
      });

      expect(userData).toBe(user);
    });

    it('should return null when user does not exist', async () => {
      mockedRepo.findOneBy.mockReturnValue(null);

      const userData = await service.findOneBy({
        username: 'test',
        email: 'test@gmail.com',
      });

      expect(userData).toBeFalsy();
    });
  });
});
