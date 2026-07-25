import { AppException } from '@app/common';
import { HttpStatus } from '@nestjs/common';

export class UserDuplicateException extends AppException {
  constructor() {
    super('user duplicate error', HttpStatus.CONFLICT);
  }
}
