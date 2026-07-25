import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class UnknownDbException extends AppException {
  constructor() {
    super('unknown db error', HttpStatus.CONFLICT);
  }
}
