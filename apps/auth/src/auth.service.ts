import { type IPayload, LoginDto, RegisterDto } from '@app/constracts';
import { UserEntity } from '@app/database';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_SERVICE') private userClientProxy: ClientProxy,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await firstValueFrom(
      this.userClientProxy.send<UserEntity>('user.createOne', registerDto),
    );

    return { user: plainToClass(UserEntity, user) };
  }

  async login(loginDto: LoginDto) {
    const user = await firstValueFrom(
      this.userClientProxy.send<UserEntity>('user.findOneBy', {
        username: loginDto.username,
      }),
    );

    if (!user || !(await bcrypt.compare(loginDto.password, user.password)))
      throw new UnauthorizedException('unauthorized!');

    const payload = { sub: user.id, username: user.username, role: user.role };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async validateToken(token: string): Promise<IPayload> {
    if (!token) throw new UnauthorizedException('unauthorized!');

    try {
      const payload = await this.jwtService.verifyAsync<IPayload>(token);

      return payload;
    } catch {
      throw new UnauthorizedException('unauthorized!');
    }
  }
}
