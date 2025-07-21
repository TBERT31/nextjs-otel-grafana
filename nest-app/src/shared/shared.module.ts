// src/shared/shared.module.ts
import { Global, Module } from '@nestjs/common';
import { DatabaseService } from '../config/database.config';
import { CustomLoggerService } from './logger/logger.service';

@Global()
@Module({
  providers: [DatabaseService, CustomLoggerService],
  exports: [DatabaseService, CustomLoggerService],
})
export class SharedModule {}