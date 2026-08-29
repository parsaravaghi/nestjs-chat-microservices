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

  @MessagePattern('user.findOneBy')
  findOneBy(@Payload() userData: UserEntity) {
    return this.usersService.findOneBy(userData);
  }

  @MessagePattern('user.findBy')
  findBy(@Payload() userData: UserEntity) {
    return this.usersService.findBy(userData);
  }

  @MessagePattern('user.findByIds')
  findByIds(@Payload() payload: { ids: string[] }) {
    return this.usersService.findByIds(payload.ids);
  }
}
