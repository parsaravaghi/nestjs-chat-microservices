import { RpcExceptionFilter } from '@app/common';
import { Catch, Logger } from '@nestjs/common';

@Catch()
export class ChatExceptionFilter extends RpcExceptionFilter {
  protected readonly logger = new Logger(ChatExceptionFilter.name);
  protected readonly duplicateErrorMessage = 'Conversation already exists';
}
