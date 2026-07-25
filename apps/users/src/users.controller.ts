import { Controller } from '@nestjs/common';
import { UsersService } from './users.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserEntity } from '@app/database';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('user.createOne')
  async createOne(@Payload() userData: UserEntity) {
    return await this.usersService.createOne(userData);
  }
}
