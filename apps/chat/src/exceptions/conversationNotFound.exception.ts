import { NotFoundException } from '@nestjs/common';

export class ConversationNotFoundException extends NotFoundException {
  constructor() {
    super('Conversation not found');
  }
}
