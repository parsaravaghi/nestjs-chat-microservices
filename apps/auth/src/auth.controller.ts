import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto, RegisterDto } from '@app/constracts/dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.register')
  async register(registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @MessagePattern('auth.login')
  async login(loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern('auth.validateToken')
  async validateToken(@Payload() token: string) {
    return await this.authService.validateToken(token);
  }
}
