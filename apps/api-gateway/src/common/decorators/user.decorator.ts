import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IPayload } from '@app/constracts';

export const User = createParamDecorator(
  (
    data: keyof IPayload | undefined,
    ctx: ExecutionContext,
  ): IPayload | IPayload[keyof IPayload] => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: IPayload }>();

    return data ? request.user[data] : request.user;
  },
);
