import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class InternalServerException extends AppException {
  constructor() {
    super('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
