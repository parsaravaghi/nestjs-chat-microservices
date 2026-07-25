import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

export class AppException extends RpcException {
  constructor(errorMessage: string, statusCode: HttpStatus) {
    super({ errorMessage, statusCode });
  }
}
