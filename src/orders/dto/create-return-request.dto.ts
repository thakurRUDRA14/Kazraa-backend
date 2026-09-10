import { IsString, MaxLength } from 'class-validator';

export class CreateReturnRequestDto {
    @IsString()
    @MaxLength(500)
    reason!: string;
}