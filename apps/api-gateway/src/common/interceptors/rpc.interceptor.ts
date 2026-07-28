import {
  CallHandler,
  ExecutionContext,
  HttpException,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';

export class RpcInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      catchError((error) => {
        // Forward HTTP exceptions without modification.
        if (error instanceof HttpException) return throwError(() => error);

        // Convert RPC service errors into HttpException so they can be handled
        // consistently by the API Gateway and returned as standard HTTP responses.
        return throwError(
          () =>
            new HttpException(
              { message: [error.errorMessage], statusCode: error.statusCode },
              error.statusCode,
            ),
        );
      }),
    );
  }
}
