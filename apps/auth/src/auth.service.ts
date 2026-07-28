import { RegisterDto } from '@app/constracts';
import { UserEntity } from '@app/database';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(@Inject('USER_SERVICE') private userClientProxy: ClientProxy) {}

  async register(registerDto: RegisterDto) {
    try {
      const user = await firstValueFrom(
        this.userClientProxy.send<UserEntity>('user.createOne', registerDto),
      );
      return plainToClass(UserEntity, user);
    } catch (error) {
      throw new RpcException(error);
    }
  }
}
