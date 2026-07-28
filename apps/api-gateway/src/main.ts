import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { RpcInterceptor } from './common/interceptors/rpc.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.useGlobalInterceptors(new RpcInterceptor());
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
