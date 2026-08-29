import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Error as MongooseError } from 'mongoose';
import { Observable, throwError } from 'rxjs';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

export type RpcErrorPayload = {
  errorMessage: string | string[];
  statusCode: number;
};

type ErrorWithCode = Error & { code: unknown };
type TypeOrmDriverError = QueryFailedError & {
  driverError?: { code?: unknown; errno?: unknown };
  code?: unknown;
  errno?: unknown;
};

const isErrorWithCode = (exception: unknown): exception is ErrorWithCode =>
  exception instanceof Error && 'code' in exception;

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(RpcExceptionFilter.name);
  protected readonly duplicateErrorMessage: string = 'Resource already exists';

  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
    return throwError(
      () => new RpcException(this.toRpcErrorPayload(exception)),
    );
  }

  protected toRpcErrorPayload(exception: unknown): RpcErrorPayload {
    const knownRpcPayload = this.getRpcPayload(exception);
    if (knownRpcPayload) {
      return knownRpcPayload;
    }

    if (exception instanceof HttpException) {
      return {
        errorMessage: this.getHttpExceptionMessage(exception),
        statusCode: exception.getStatus(),
      };
    }

    if (this.isDuplicateDatabaseError(exception)) {
      return {
        errorMessage: this.duplicateErrorMessage,
        statusCode: HttpStatus.CONFLICT,
      };
    }

    if (
      exception instanceof EntityNotFoundError ||
      exception instanceof MongooseError.DocumentNotFoundError
    ) {
      return {
        errorMessage: 'Resource not found',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    if (exception instanceof MongooseError.ValidationError) {
      return {
        errorMessage: 'Invalid data',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }

    this.logUnexpectedError(exception);
    return {
      errorMessage: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  private isDuplicateDatabaseError(exception: unknown): boolean {
    if (isErrorWithCode(exception) && exception.code === 11000) {
      return true;
    }

    if (!(exception instanceof QueryFailedError)) {
      return false;
    }

    const queryError = exception as TypeOrmDriverError;
    return (
      queryError.driverError?.errno === 1062 ||
      queryError.driverError?.code === 'ER_DUP_ENTRY' ||
      queryError.errno === 1062 ||
      queryError.code === 'ER_DUP_ENTRY'
    );
  }

  private getRpcPayload(exception: unknown): RpcErrorPayload | null {
    const payload =
      exception instanceof RpcException ? exception.getError() : exception;

    if (!this.isRecord(payload)) {
      return null;
    }

    const candidate = this.isRecord(payload.error) ? payload.error : payload;
    const errorMessage = candidate.errorMessage ?? candidate.message;

    if (
      !this.isHttpStatus(candidate.statusCode) ||
      !this.isMessage(errorMessage)
    ) {
      return null;
    }

    return { errorMessage, statusCode: candidate.statusCode };
  }

  private getHttpExceptionMessage(exception: HttpException): string | string[] {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (this.isRecord(response) && this.isMessage(response.message)) {
      return response.message;
    }

    return exception.message;
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

  private logUnexpectedError(exception: unknown): void {
    if (exception instanceof QueryFailedError) {
      const queryError = exception as TypeOrmDriverError;
      this.logger.error('Unexpected database error', {
        name: exception.name,
        code: queryError.driverError?.code ?? queryError.driverError?.errno,
      });
      return;
    }

    if (exception instanceof Error) {
      this.logger.error('Unexpected application error', {
        name: exception.name,
        code: isErrorWithCode(exception) ? exception.code : undefined,
      });
      return;
    }

    this.logger.error('Unknown non-Error value received');
  }
}
