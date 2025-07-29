import { Module } from '@nestjs/common';
import { LoggerServiceImplementation } from './logger.service';

@Module({
  providers: [LoggerServiceImplementation],
  exports: [LoggerServiceImplementation],
})
export class LoggerModule {}
