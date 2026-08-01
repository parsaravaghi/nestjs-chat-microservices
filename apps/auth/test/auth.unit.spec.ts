import { Test } from '@nestjs/testing';
import { ValidationError } from '@nestjs/common';
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
import { AuthService } from '../src/auth.service';
import { RegisterDto } from '@app/constracts';
import { UserEntity, UserRole } from '@app/database';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UnautorizedRpcException } from '../src/exceptions/unauthorized.exception';

describe('Auth (unit)', () => {
  let service: AuthService;

  // Mock external microservice communication to isolate AuthService behavior.
  const mockedClient = {
    send: jest.fn(),
  };

  // Mock JWT operations to avoid generating real tokens during unit tests.
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

    // Reset test input before every test to prevent state leakage.
    registerInput = { ...defaultInput };

    jest.clearAllMocks();
  });

  afterEach(() => {
    registerInput = { ...defaultInput };
  });

  // Convert DTO data and validate all class-validator rules.
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
      // Replace a specific DTO property with invalid data to test validation rules.
      registerInput[field as keyof typeof registerInput] = value as never;

      const errors = await validateDto();

      expect(errors[0].constraints).toHaveProperty(constraint);
    });
  });

  describe('register', () => {
    it('should return user', async () => {
      // Mock successful user-service response.
      mockedClient.send.mockReturnValue(of(user));

      await expect(service.register(user)).resolves.toEqual({
        user: plainToInstance(UserEntity, user),
      });
    });

    it('should throw RpcException', async () => {
      const error = new RpcException('test rpc');

      // Mock user-service failure response.
      mockedClient.send.mockReturnValue(throwError(() => error));

      await expect(service.register(user)).rejects.toThrow(RpcException);
    });
  });

  describe('login', () => {
    it('should return mocked jwt token as an access token', async () => {
      // Mock JWT creation and provide a valid hashed password.
      mockeJwt.signAsync.mockReturnValue('example jwt token');

      mockedClient.send.mockReturnValue(
        of({ ...user, password: await bcrypt.hash(user.password, 12) }),
      );

      const result = await service.login(user);

      expect(result).toEqual({ access_token: 'example jwt token' });
    });

    it('should throw unauthorized error for missing user information', async () => {
      mockeJwt.signAsync.mockReturnValue('example jwt token');

      // Simulate user-service returning no matching user.
      mockedClient.send.mockReturnValue(of(null));

      await expect(service.login(user)).rejects.toThrow(
        UnautorizedRpcException,
      );
    });

    it('should throw unauthorized error for wrong password', async () => {
      mockeJwt.signAsync.mockReturnValue('example jwt token');

      // Simulate incorrect stored password data.
      mockedClient.send.mockReturnValue(of(user));

      await expect(service.login(user)).rejects.toThrow(
        UnautorizedRpcException,
      );
    });
  });
});
