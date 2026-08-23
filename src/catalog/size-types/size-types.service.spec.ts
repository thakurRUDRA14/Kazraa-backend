import { Test, TestingModule } from '@nestjs/testing';
import { SizeTypesService } from './size-types.service';

describe('SizeTypesService', () => {
  let service: SizeTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SizeTypesService],
    }).compile();

    service = module.get<SizeTypesService>(SizeTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
