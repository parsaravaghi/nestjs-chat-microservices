import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { createRmqOptions } from '@app/constracts';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER } from '@nestjs/core';
import { RpcExceptionFilter } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', './apps/auth/.env'],
    }),

    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        inject: [ConfigService],

        useFactory: createRmqOptions('user_queue'),
      },
    ]),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '1d',
          },

          // Restore multiline PEM keys stored as environment variables.
          privateKey: configService
            .get<string>('APP_JWT_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),

          publicKey: configService
            .get<string>('APP_JWT_PUBLIC_KEY')
            ?.replace(/\\n/g, '\n'),
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_FILTER, useClass: RpcExceptionFilter },
  ],
})
export class AuthModule {}
