import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

import { ChatModule } from './chat.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ChatModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [
          `amqp://${process.env.APP_MB_USER}:${process.env.APP_MB_PASSWORD}@${process.env.APP_MB_HOST}:${process.env.APP_MB_PORT}`,
        ],
        queue: 'chat_queue',
      },
    },
  );

  await app.listen();
}

bootstrap();
