import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ConversationListResponseDto,
  ConversationPaginationQueryDto,
  createConversationDto,
  UserRole,
  SendMessageDto,
} from '@app/constracts';
import { User } from '../common/decorators/user.decorator';
import { type IPayload } from '@app/constracts';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/role.decorator';

@Controller('chat')
export class ChatController {
  constructor(
    @Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
  ) {}

  @Post('conversations')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard)
  createConversation(
    @Body() dto: createConversationDto,
    @User() user: IPayload,
  ) {
    return this.chatClient.send('chat.createConversation', {
      dto,
      userId: user.sub,
    });
  }

  @Get('conversations')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([UserRole.USER, UserRole.ADMIN])
  myConversations(
    @Query() query: ConversationPaginationQueryDto,
    @User() user: IPayload,
  ) {
    return this.chatClient.send<ConversationListResponseDto>(
      'chat.myConversations',
      { userId: user.sub, cursor: query.cursor, limit: query.limit },
    );
  }

  @Post('conversations/:conversationId/message')
  /** @deprecated Use the Socket.IO `sendMessage` event. */
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([UserRole.USER, UserRole.ADMIN])
  sendMessage(
    @Param('conversationId') conversationId: string,
    @User() user: IPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatClient.send('chat.sendMessage', {
      conversationId,
      userId: user.sub,
      dto,
    });
  }
}
