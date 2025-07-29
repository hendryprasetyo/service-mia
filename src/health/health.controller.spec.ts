import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { TestSetupModule } from 'src/config/test-setup.module';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TestSetupModule],
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getFooterLayout', () => {
    it('Should be return Success', async () => {
      const res = controller.ping();
      expect(res).toEqual('ok');
    });
  });
});
