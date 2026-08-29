import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@app/database';
import { APP_FILTER } from '@nestjs/core';
import { UsersExceptionFilter } from './filters/usersException.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', './apps/users/.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        return {
          type: 'mysql',
          host: configService.get('APP_DB_HOST'),
          port: configService.get('APP_DB_PORT'),
          username: configService.get('APP_DB_USER'),
          password: configService.get('APP_DB_PASSWORD'),
          database: configService.get('APP_DB_NAME'),

          synchronize: configService.get('APP_ENVIROMENT') === 'development',

          entities: [UserEntity],
        };
      },
    }),

    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: APP_FILTER, useClass: UsersExceptionFilter },
  ],
})
export class UsersModule {}
