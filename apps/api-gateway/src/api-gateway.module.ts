import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createRmqOptions } from '@app/constracts';
import { ChatController } from './chat/chat.controller';
import { ChatGateway } from './chat/chat.gateway';
import { ChatEventsController } from './chat/chatEvents.controller';
import { WebSocketAuthMiddleware } from './common/middlewares/webSocketAuth.middleware';
import { WsJwtGuard } from './common/guards/ws-jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        inject: [ConfigService],

        useFactory: createRmqOptions('auth_queue'),
      },
      {
        name: 'CHAT_SERVICE',
        inject: [ConfigService],

        useFactory: createRmqOptions('chat_queue'),
      },
    ]),
  ],
  controllers: [AuthController, ChatController, ChatEventsController],
  providers: [ChatGateway, WebSocketAuthMiddleware, WsJwtGuard],
})
export class ApiGatewayModule {}
