import { IPayload } from '@app/constracts';
import { CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UnauthorizedException } from '../exceptions/unauthorized.exception';

export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return true;
    }

    try {
      request['user'] = await firstValueFrom(
        this.authClient.send<IPayload>('auth.validateToken', token),
      );

      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const requestHeader = request as Request & {
      headers: { authorization: string };
    };

    const authorization = requestHeader.headers.authorization;

    if (!authorization) {
      return;
    }

    const [scheme, token] = authorization.split(' ');

    return scheme === 'Bearer' ? token : undefined;
  }
}
