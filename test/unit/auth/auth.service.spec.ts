import { Test } from '@nestjs/testing';
import { UnauthorizedException, ValidationError } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../apps/auth/src/auth.service';
import { RegisterDto } from '@app/constracts';
import { UserEntity, UserRole } from '@app/database';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

describe('Auth (unit)', () => {
  let service: AuthService;

  const mockedClient = {
    send: jest.fn(),
  };

  const mockeJwt = {
    sign: jest.fn,
    signAsync: jest.fn(),
  };

  const user: UserEntity = {
    id: 'uuid',
    username: 'test',
    password: '12345678',
    email: 'test@gmail.com',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultInput = {
    username: 'test',
    password: '12345678',
    email: 'test@gmail.com',
  };

  let registerInput: typeof defaultInput;
  const registerDto = defaultInput as RegisterDto;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'USER_SERVICE',
          useValue: mockedClient,
        },
        {
          provide: JwtService,
          useValue: mockeJwt,
        },
      ],
    }).compile();

    service = module.get(AuthService);

    registerInput = { ...defaultInput };

    jest.clearAllMocks();
  });

  afterEach(() => {
    registerInput = { ...defaultInput };
  });

  async function validateDto(): Promise<ValidationError[]> {
    return validate(plainToInstance(RegisterDto, registerInput));
  }

  describe('RegisterDto validation', () => {
    it.each([
      ['username', 1, 'isString'],
      ['username', '', 'matches'],
      ['username', undefined, 'isDefined'],

      ['email', 1, 'isString'],
      ['email', 'test', 'isEmail'],
      ['email', undefined, 'isDefined'],

      ['password', 1, 'isString'],
      ['password', '12', 'minLength'],
      ['password', undefined, 'isDefined'],
    ])('should validate %s (%p -> %s)', async (field, value, constraint) => {
      registerInput[field as keyof typeof registerInput] = value as never;

      const errors = await validateDto();

      expect(errors[0].constraints).toHaveProperty(constraint);
    });
  });

  describe('register', () => {
    it('should return user', async () => {
      mockedClient.send.mockReturnValue(of(user));

      await expect(service.register(registerDto)).resolves.toEqual({
        user: plainToInstance(UserEntity, user),
      });
    });

    it('should throw RpcException', async () => {
      const error = new RpcException('test rpc');

      mockedClient.send.mockReturnValue(throwError(() => error));

      await expect(service.register(registerDto)).rejects.toBe(error);
    });
  });

  describe('login', () => {
    it('should return mocked jwt token as an access token', async () => {
      mockeJwt.signAsync.mockReturnValue('example jwt token');

      mockedClient.send.mockReturnValue(
        of({ ...user, password: await bcrypt.hash(user.password, 12) }),
      );

      const result = await service.login(user);

      expect(result).toEqual({ access_token: 'example jwt token' });
    });

    it('should throw unauthorized error for missing user information', async () => {
      mockeJwt.signAsync.mockReturnValue('example jwt token');

      mockedClient.send.mockReturnValue(of(null));

      await expect(service.login(user)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw unauthorized error for wrong password', async () => {
      mockeJwt.signAsync.mockReturnValue('example jwt token');

      mockedClient.send.mockReturnValue(of(user));

      await expect(service.login(user)).rejects.toThrow(UnauthorizedException);
    });
  });
});
