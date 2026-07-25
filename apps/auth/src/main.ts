import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [
          `amqp://${process.env.APP_MB_USER}:${process.env.APP_MB_PASSWORD}@${process.env.APP_MB_HOST}:${process.env.APP_MB_PORT}`,
        ],
        queue: 'auth_queue',
      },
    },
  );
  await app.listen();
}
bootstrap();
