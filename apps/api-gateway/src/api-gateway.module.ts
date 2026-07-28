import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createRmqOptions } from '@app/constracts';

@Module({
  imports: [
    // Make environment variables available application-wide.
    ConfigModule.forRoot({ isGlobal: true }),

    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        inject: [ConfigService],

        // Configure the RabbitMQ client using environment-based settings.
        useFactory: createRmqOptions('auth_queue'),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [],
})
export class ApiGatewayModule {}
