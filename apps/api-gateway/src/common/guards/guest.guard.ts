import { IPayload } from '@app/constracts';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UnauthorizedException } from '../exceptions/unauthorized.exception';

export class GuestGard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authRequest = request as Request & {
      user: IPayload;
    };

    if (authRequest.user) throw new UnauthorizedException();

    return true;
  }
}
