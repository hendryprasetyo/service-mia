import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';

@Module({
  imports: [LoggerModule, GeneralModule],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
