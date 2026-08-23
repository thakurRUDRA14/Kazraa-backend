import { PartialType } from '@nestjs/mapped-types';
import { CreateSizeTypeDto } from './create-size-type.dto';

export class UpdateSizeTypeDto extends PartialType(CreateSizeTypeDto) { }