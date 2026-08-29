import { HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { QueryFailedError } from 'typeorm';
import { UsersExceptionFilter } from '../../../apps/users/src/filters/usersException.filter';

describe('UsersExceptionFilter', () => {
  const filter = new UsersExceptionFilter();
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

  it('maps MySQL duplicate entries to the existing conflict response', async () => {
    const error = new QueryFailedError(
      'INSERT INTO users',
      [],
      Object.assign(new Error('raw duplicate details'), { errno: 1062 }),
    );

    await expect(getRpcError(error)).resolves.toEqual({
      errorMessage: 'user duplicate error',
      statusCode: HttpStatus.CONFLICT,
    });
  });

  it('maps other database failures to internal server error', async () => {
    const error = new QueryFailedError(
      'INSERT INTO users',
      [],
      Object.assign(new Error('raw database details'), { errno: 1063 }),
    );

    await expect(getRpcError(error)).resolves.toEqual({
      errorMessage: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
    expect(loggerError).toHaveBeenCalledWith('Unexpected database error', {
      name: error.name,
      code: 1063,
    });
  });
});
