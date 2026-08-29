import {
  CHAT_CONVERSATION_CREATED_EVENT,
  CHAT_MESSAGE_SENT_EVENT,
} from '@app/constracts';
import type {
  ConversationCreatedEvent,
  MessageSentEvent,
} from '@app/constracts';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ChatGateway } from './chat.gateway';

@Controller()
export class ChatEventsController {
  constructor(private readonly chatGateway: ChatGateway) {}

  @EventPattern(CHAT_CONVERSATION_CREATED_EVENT)
  async handleConversationCreated(
    @Payload() event: ConversationCreatedEvent,
  ): Promise<void> {
    await this.chatGateway.emitConversationCreated(event);
  }

  @EventPattern(CHAT_MESSAGE_SENT_EVENT)
  handleMessageSent(@Payload() event: MessageSentEvent): void {
    this.chatGateway.emitMessageSent(event);
  }
}
