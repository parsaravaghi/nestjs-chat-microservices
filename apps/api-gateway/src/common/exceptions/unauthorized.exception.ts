import { HttpException, HttpStatus } from '@nestjs/common';

export class UnauthorizedException extends HttpException {
  constructor() {
    super(
      { message: ['unauthorized'], statusCode: HttpStatus.UNAUTHORIZED },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
