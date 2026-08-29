import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { catchError, Observable, throwError } from 'rxjs';

type ErrorResponse = {
  statusCode: number;
  message: string | string[];
};

type RpcErrorPayload = {
  statusCode?: unknown;
  errorMessage?: unknown;
  message?: unknown;
};

@Injectable()
export class RpcInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RpcInterceptor.name);

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(
        catchError((error: unknown) =>
          throwError(() => this.toHttpException(error)),
        ),
      );
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    const rpcPayload = this.getRpcPayload(error);
    if (rpcPayload) {
      const response: ErrorResponse = {
        statusCode: rpcPayload.statusCode,
        message: rpcPayload.message,
      };

      return new HttpException(response, rpcPayload.statusCode);
    }

    this.logUnknownError(error);

    return new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      } satisfies ErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private getRpcPayload(
    error: unknown,
  ): { statusCode: number; message: string | string[] } | null {
    const payload = error instanceof RpcException ? error.getError() : error;

    if (!this.isRecord(payload)) {
      return null;
    }

    const candidate = this.unwrapRpcPayload(payload);
    if (!this.isHttpStatus(candidate.statusCode)) {
      return null;
    }

    const message = candidate.errorMessage ?? candidate.message;
    if (!this.isMessage(message)) {
      return null;
    }

    return { statusCode: candidate.statusCode, message };
  }

  private unwrapRpcPayload(payload: Record<string, unknown>): RpcErrorPayload {
    if (this.isRecord(payload.error)) {
      return payload.error;
    }

    return payload;
  }

  private isHttpStatus(value: unknown): value is number {
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 400 &&
      value <= 599
    );
  }

  private isMessage(value: unknown): value is string | string[] {
    return (
      typeof value === 'string' ||
      (Array.isArray(value) && value.every((item) => typeof item === 'string'))
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private logUnknownError(error: unknown): void {
    if (error instanceof Error) {
      this.logger.error('Unexpected RPC error', { name: error.name });
      return;
    }

    this.logger.error('Unknown non-Error RPC value received');
  }
}
