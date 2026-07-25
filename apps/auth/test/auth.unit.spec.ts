import { AuthService } from '../src/auth.service';
import { Test } from '@nestjs/testing';
import { UserEntity, UserRole } from '@app/database';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RpcException } from '@nestjs/microservices';

describe('Auth (unit)', () => {
  let service: AuthService;

  const mockedClient = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'USER_SERVICE', useValue: mockedClient },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    const user = {
      id: 'uuid',
      username: 'test',
      password: '12345678',
      email: 'test@gmail.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      role: UserRole.USER,
    } as UserEntity;

    it('should return mocked user', async () => {
      mockedClient.send.mockReturnValue(of(user));

      const result = await service.register(user);

      expect(result).toBe(user);
    });

    it('should throw a rpc exception error', async () => {
      const error = new RpcException('test rpc');

      mockedClient.send.mockReturnValue(() => {
        throwError(() => error);
      });

      await expect(service.register(user)).rejects.toThrow();
    });
  });
});
