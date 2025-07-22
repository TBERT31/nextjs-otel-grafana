import { Controller, Get, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    try {
      if (!this.metricsService.isInitialized()) {
        throw new HttpException(
          'Metrics not initialized',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const metrics = await this.metricsService.getMetrics();
      
      if (!metrics) {
        throw new HttpException(
          'Failed to retrieve metrics',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      res.set({
        'Content-Type': this.metricsService.getContentType(),
      });

      return res.send(metrics);
    } catch (error) {
      console.error('Error generating metrics:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('test-signup')
  testSignup(@Res() res: Response) {
    try {
      this.metricsService.incrementUserSignups('premium', 'website');
      return res.json({ 
        message: 'User signup metric incremented',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error incrementing signup metric:', error);
      throw new HttpException(
        'Failed to increment metric',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}