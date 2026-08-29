import { Controller } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ConversationPaginationQueryDto,
  createConversationDto,
  SendMessageDto,
} from '@app/constracts';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @MessagePattern('chat.createConversation')
  async createConversation(
    @Payload() args: { dto: createConversationDto; userId: string },
  ) {
    return await this.chatService.createConversation(args);
  }

  @MessagePattern('chat.myConversations')
  myConversations(
    @Payload()
    args: ConversationPaginationQueryDto & { userId: string },
  ) {
    return this.chatService.myConversations(args);
  }

  @MessagePattern('chat.sendMessage')
  sendMessage(
    @Payload()
    args: {
      conversationId: string;
      userId: string;
      dto: SendMessageDto;
      publishEvent?: boolean;
    },
  ) {
    return this.chatService.sendMessage(
      args.conversationId,
      args.userId,
      args.dto,
      { publishEvent: args.publishEvent },
    );
  }

  @MessagePattern('chat.myConversationIds')
  myConversationIds(@Payload() userId: string) {
    return this.chatService.myConversationIds(userId);
  }
}
