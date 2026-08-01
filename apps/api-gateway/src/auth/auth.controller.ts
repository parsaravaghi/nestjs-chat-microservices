import {
  type IPayload,
  LoginDto,
  RegisterDto,
  UserRole,
} from '@app/constracts';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '../common/guards/auth.guard';
import { GuestGard } from '../common/guards/guest.guard';
import { User } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private clientProxy: ClientProxy) {}

  @Post('register')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard, GuestGard)
  register(@Body() registerDto: RegisterDto) {
    return this.clientProxy.send('auth.register', registerDto);
  }

  @Post('login')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard, GuestGard)
  login(@Body() loginDto: LoginDto) {
    return this.clientProxy.send('auth.login', loginDto);
  }

  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([UserRole.USER, UserRole.ADMIN])
  me(@User() user: IPayload) {
    return { user };
  }
}
