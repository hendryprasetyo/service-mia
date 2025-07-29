import { Controller, Get } from '@nestjs/common';

@Controller('sys')
export class HealthController {
  @Get('/ping')
  ping() {
    return 'ok';
  }
}
