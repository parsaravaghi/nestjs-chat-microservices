import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom, throwError } from 'rxjs';
import { RpcInterceptor } from '../../../apps/api-gateway/src/common/interceptors/rpc.interceptor';

describe('RpcInterceptor', () => {
  const interceptor = new RpcInterceptor();
  const context = {} as ExecutionContext;
  const loggerError = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const interceptError = async (error: unknown): Promise<HttpException> => {
    const next: CallHandler = {
      handle: () => throwError(() => error),
    };

    try {
      await firstValueFrom(interceptor.intercept(context, next));
      throw new Error('Expected the interceptor to throw');
    } catch (caught) {
      return caught as HttpException;
    }
  };

  it('preserves existing HTTP exceptions', async () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    await expect(interceptError(exception)).resolves.toBe(exception);
  });

  it('converts RpcException payloads to HTTP exceptions', async () => {
    const exception = await interceptError(
      new RpcException({
        errorMessage: 'Conversation already exists',
        statusCode: HttpStatus.CONFLICT,
      }),
    );

    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.CONFLICT,
      message: 'Conversation already exists',
    });
  });

  it('handles serialized and nested RPC error payloads', async () => {
    const exception = await interceptError({
      error: {
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['participantIds must be an array'],
      },
    });

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      message: ['participantIds must be an array'],
    });
  });

  it('sanitizes unknown internal errors', async () => {
    const exception = await interceptError(
      new Error('database password leaked'),
    );

    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
    expect(loggerError).toHaveBeenCalledWith('Unexpected RPC error', {
      name: 'Error',
    });
  });
});
