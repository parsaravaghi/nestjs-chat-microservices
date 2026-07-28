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

describe('Auth (unit)', () => {
  let service: AuthService;

  // Mock the USER_SERVICE microservice client.
  const mockedClient = {
    send: jest.fn(),
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
      ],
    }).compile();

    service = module.get(AuthService);

    // Start each test with a fresh copy of the default input.
    registerInput = { ...defaultInput };

    jest.clearAllMocks();
  });

  afterEach(() => {
    registerInput = { ...defaultInput };
  });

  // Helper function to validate the current DTO state.
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
      // Dynamically replace the field being tested with an invalid value.
      registerInput[field as keyof typeof registerInput] = value as never;

      const errors = await validateDto();

      expect(errors[0].constraints).toHaveProperty(constraint);
    });
  });

  describe('register()', () => {
    const user: UserEntity = {
      id: 'uuid',
      username: 'test',
      password: '12345678',
      email: 'test@gmail.com',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user', async () => {
      // Simulate a successful response from the user microservice.
      mockedClient.send.mockReturnValue(of(user));

      await expect(service.register(user)).resolves.toEqual(
        plainToInstance(UserEntity, user),
      );
    });

    it('should throw RpcException', async () => {
      const error = new RpcException('test rpc');

      // Simulate a failed RPC request.
      mockedClient.send.mockReturnValue(throwError(() => error));

      await expect(service.register(user)).rejects.toThrow(RpcException);
    });
  });
});
