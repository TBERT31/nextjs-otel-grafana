import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { AppService } from './app.service';
import { CustomLoggerService } from './shared/logger/logger.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: CustomLoggerService
  ) {}

  @Get()
  getRoot(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }

  @Get('health')
  async getHealth(@Res() res: Response) {
    try {
      this.logger.info('GET /health - Health check requested');

      // Tester la connexion à la base de données
      const dbHealthy = await this.appService.testDatabaseConnection();

      const healthStatus = {
        status: dbHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        service: process.env.OTEL_SERVICE_NAME || 'nest-app',
        version: process.env.OTEL_SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: dbHealthy ? 'connected' : 'disconnected',
        aliveSince: process.uptime(),
      };

      const statusCode = dbHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

      this.logger.info('GET /health - Health check completed', {
        status: healthStatus.status,
        timestamp: healthStatus.timestamp,
        service: healthStatus.service,
        version: healthStatus.version,
        environment: healthStatus.environment,
        database: healthStatus.database,
        aliveSince: healthStatus.aliveSince,
      });

      return res.status(statusCode).json(healthStatus);

    } catch (error) {
      this.logger.error('GET /health - Health check failed', error as Error);

      const errorResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: process.env.OTEL_SERVICE_NAME || 'nest-app',
        error: 'Health check failed',
      };

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
}