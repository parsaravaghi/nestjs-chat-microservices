import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { createRmqOptions } from '@app/constracts';
import { JwtModule } from '@nestjs/jwt';

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

        // Configure the RabbitMQ client using environment-based connection settings.
        useFactory: createRmqOptions('user_queue'),
      },
    ]),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          signOptions: {
            // Use RSA asymmetric encryption for signing JWTs.
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
  providers: [AuthService],
})
export class AuthModule {}
