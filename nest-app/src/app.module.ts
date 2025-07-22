import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TodosModule } from './todos/todos.module';
import { CustomLoggerService } from './shared/logger/logger.service';
import { SharedModule } from './shared/shared.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    TodosModule,
    MetricsModule],
  controllers: [AppController],
  providers: [CustomLoggerService, AppService],
})
export class AppModule {}
