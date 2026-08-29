import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EntityNotFoundError } from 'typeorm';
import { UserEntity } from '@app/database';
import { RpcExceptionFilter } from '../../../libs/common/src';

describe('RpcExceptionFilter', () => {
  const filter = new RpcExceptionFilter();
  const loggerError = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getRpcError = async (exception: unknown) => {
    try {
      await firstValueFrom(filter.catch(exception, {} as never));
    } catch (error) {
      return (error as RpcException).getError();
    }
  };

  it('preserves a standard downstream RPC error', async () => {
    await expect(
      getRpcError({
        error: {
          errorMessage: 'user duplicate error',
          statusCode: HttpStatus.CONFLICT,
        },
      }),
    ).resolves.toEqual({
      errorMessage: 'user duplicate error',
      statusCode: HttpStatus.CONFLICT,
    });
  });

  it('maps Nest HTTP exceptions to the RPC contract', async () => {
    await expect(
      getRpcError(new BadRequestException(['invalid username'])),
    ).resolves.toEqual({
      errorMessage: ['invalid username'],
      statusCode: HttpStatus.BAD_REQUEST,
    });
  });

  it('maps ORM record-not-found errors to not found', async () => {
    await expect(
      getRpcError(new EntityNotFoundError(UserEntity, { id: 'missing' })),
    ).resolves.toEqual({
      errorMessage: 'Resource not found',
      statusCode: HttpStatus.NOT_FOUND,
    });
  });

  it('maps unexpected errors without exposing internal details', async () => {
    await expect(
      getRpcError(new Error('database password leaked')),
    ).resolves.toEqual({
      errorMessage: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
    expect(loggerError).toHaveBeenCalledWith('Unexpected application error', {
      name: 'Error',
      code: undefined,
    });
    expect(loggerError).not.toHaveBeenCalledWith(
      expect.stringContaining('password'),
      expect.anything(),
    );
  });
});
