import { Test, TestingModule } from '@nestjs/testing';
import { SizeTypesController } from './size-types.controller';

describe('SizeTypesController', () => {
  let controller: SizeTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SizeTypesController],
    }).compile();

    controller = module.get<SizeTypesController>(SizeTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
