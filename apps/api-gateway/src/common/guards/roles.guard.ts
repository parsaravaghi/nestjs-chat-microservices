import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Roles } from '../decorators/role.decorator';
import { IPayload } from '@app/constracts';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '../exceptions/unauthorized.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: IPayload }>();

    if (!request.user) throw new UnauthorizedException();

    return roles.includes(request.user.role);
  }
}
