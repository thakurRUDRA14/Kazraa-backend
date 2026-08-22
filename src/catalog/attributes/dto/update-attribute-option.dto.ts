import { PartialType } from '@nestjs/mapped-types';
import { CreateAttributeOptionDto } from './create-attribute-option.dto';

export class UpdateAttributeOptionDto extends PartialType(
  CreateAttributeOptionDto,
) { }