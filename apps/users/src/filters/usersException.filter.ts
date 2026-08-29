import { RpcExceptionFilter } from '@app/common';
import { Catch, Logger } from '@nestjs/common';

@Catch()
export class UsersExceptionFilter extends RpcExceptionFilter {
  protected readonly logger = new Logger(UsersExceptionFilter.name);
  protected readonly duplicateErrorMessage = 'user duplicate error';
}
