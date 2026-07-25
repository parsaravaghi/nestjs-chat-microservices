import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

export const createRmqOptions =
  (queue: string) => (configService: ConfigService) => {
    const host = configService.get<string>('APP_MB_HOST');
    const port = configService.get<number>('APP_MB_PORT');
    const user = configService.get<string>('APP_MB_USER');
    const password = configService.get<string>('APP_MB_PASSWORD');

    return {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${user}:${password}@${host}:${port}`],
        queue: queue,
      },
    } as RmqOptions;
  };
