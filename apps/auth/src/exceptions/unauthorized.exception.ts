import { AppException } from '@app/common';
import { HttpStatus } from '@nestjs/common';

export class UnautorizedRpcException extends AppException {
  constructor() {
    super('unauthorized!', HttpStatus.UNAUTHORIZED);
  }
}
