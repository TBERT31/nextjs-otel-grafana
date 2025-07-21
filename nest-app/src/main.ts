import './tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

   app.enableCors();

   app.setGlobalPrefix('api', {
      exclude: ['/', '/health'] // Exclure les routes statiques
   });

  const port = process.env.PORT || 8080;
  
  await app.listen(port);
  
  logger.log(`Server listening on port ${port}`);
  logger.log(`OpenTelemetry service name: ${process.env.OTEL_SERVICE_NAME || 'nest-app'}`);
  logger.log(`OpenTelemetry endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'default'}`);

  // Gestion de l'arrêt gracieux
  process.on('SIGINT', async () => {
    logger.log('Shutting down server...');
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  });
}
bootstrap();
