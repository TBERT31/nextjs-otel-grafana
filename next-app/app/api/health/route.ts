import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    logger.info('GET /api/health - Health check requested');

    // Tester la connexion à la base de données
    const dbHealthy = await db.testConnection();

    const healthStatus = {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: process.env.OTEL_SERVICE_NAME || 'next-app',
      version: process.env.OTEL_SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    };

    const statusCode = dbHealthy ? 200 : 503;

    logger.info('GET /api/health - Health check completed', { 
      status: healthStatus.status,
      database: healthStatus.database 
    });

    return NextResponse.json(healthStatus, { 
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    logger.error('GET /api/health - Health check failed', error as Error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: process.env.OTEL_SERVICE_NAME || 'next-app',
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}