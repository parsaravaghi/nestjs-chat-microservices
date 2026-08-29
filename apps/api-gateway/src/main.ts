import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { RpcInterceptor } from './common/interceptors/rpc.interceptor';
import { API_GATEWAY_EVENTS_QUEUE, createRmqOptions } from '@app/constracts';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.useGlobalInterceptors(new RpcInterceptor());

  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>(
    createRmqOptions(API_GATEWAY_EVENTS_QUEUE)(configService),
  );

  await app.startAllMicroservices();
  await app.listen(process.env.port ?? 3000);
}
void bootstrap();
