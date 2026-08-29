import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { API_GATEWAY_EVENTS_QUEUE, createRmqOptions } from '@app/constracts';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Participant, ParticipantSchema } from './schemas/participants.schema';
import { APP_FILTER } from '@nestjs/core';
import { ChatExceptionFilter } from './filters/chatException.filter';
import { ChatEventsPublisher } from './chatEvents.publisher';
import { Message, MessageSchema } from './schemas/message.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', './apps/chat/.env'],
    }),
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        inject: [ConfigService],
        useFactory: createRmqOptions('user_queue'),
      },
      {
        name: 'API_GATEWAY_SERVICE',
        inject: [ConfigService],
        useFactory: createRmqOptions(API_GATEWAY_EVENTS_QUEUE),
      },
    ]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('APP_DB_HOST');
        const port = configService.get<number>('APP_DB_PORT');
        const dbName = configService.get<string>('APP_DB_NAME');
        const username = configService.get<string>('APP_DB_USERNAME');
        const password = configService.get<string>('APP_DB_PASSWORD');
        return {
          uri: `mongodb://${username}:${password}@${host}:${port}/${dbName}?authSource=admin&replicaSet=rs0`,
        };
      },
    }),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatEventsPublisher,
    { provide: APP_FILTER, useClass: ChatExceptionFilter },
  ],
})
export class ChatModule {}
