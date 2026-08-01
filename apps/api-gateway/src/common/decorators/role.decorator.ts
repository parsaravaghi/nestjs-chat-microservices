import { UserRole } from '@app/constracts';
import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<UserRole[]>();
