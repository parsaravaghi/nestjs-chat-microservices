import { type IPayload, LoginDto, RegisterDto } from '@app/constracts';
import { UserEntity } from '@app/database';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';
import { UnautorizedRpcException } from './exceptions/unauthorized.exception';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_SERVICE') private userClientProxy: ClientProxy,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      // Communicate with the user microservice to create the user.
      const user = await firstValueFrom(
        this.userClientProxy.send<UserEntity>('user.createOne', registerDto),
      );

      // Transform plain response data into the expected entity structure.
      return { user: plainToClass(UserEntity, user) };
    } catch (error) {
      // Convert microservice errors into NestJS RPC-compatible exceptions.
      throw new RpcException(error);
    }
  }

  async login(loginDto: LoginDto) {
    // Retrieve user data from the user microservice for authentication.
    const user = await firstValueFrom(
      this.userClientProxy.send<UserEntity>('user.findOneBy', {
        username: loginDto.username,
      }),
    );

    // Validate user existence and compare the provided password with the hashed password.
    if (!user || !(await bcrypt.compare(loginDto.password, user.password)))
      throw new UnautorizedRpcException();

    // Include required identity and authorization data inside the JWT payload.
    const payload = { sub: user.id, username: user.username, role: user.role };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async validateToken(token: string): Promise<IPayload> {
    if (!token) throw new UnautorizedRpcException();

    try {
      // Verify JWT signature and expiration before trusting the payload.
      const payload = await this.jwtService.verifyAsync<IPayload>(token);

      return payload;
    } catch {
      // Hide JWT verification details and return a consistent authentication error.
      throw new UnautorizedRpcException();
    }
  }
}
