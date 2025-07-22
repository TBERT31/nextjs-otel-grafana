import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  async getMetrics(): Promise<string> {
    if (!globalThis?.metrics?.registry) {
      throw new Error('Metrics registry not initialized');
    }
    
    return await globalThis.metrics.registry.metrics();
  }

  getContentType(): string {
    if (!globalThis?.metrics?.registry) {
      return 'text/plain';
    }
    
    return globalThis.metrics.registry.contentType;
  }

  incrementUserSignups(planType: string = 'free', referralSource: string = 'direct'): void {
    if (globalThis?.metrics?.userSignups) {
      globalThis.metrics.userSignups.labels(planType, referralSource).inc();
    }
  }

  isInitialized(): boolean {
    return !!globalThis?.metrics?.registry;
  }
}