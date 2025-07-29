import { Module } from '@nestjs/common';
import { PagesService } from './pages.service';
import { PagesController } from './pages.controller';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';
import { GeneralModule } from 'src/common/helpers/general/general.module';

@Module({
  imports: [LoggerModule, GeneralModule],
  controllers: [PagesController],
  providers: [PagesService],
})
export class PagesModule {}
