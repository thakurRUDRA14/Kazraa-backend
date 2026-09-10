import { IsString, MaxLength } from 'class-validator';

export class CreateRtoDto {
    @IsString()
    @MaxLength(500)
    reason!: string;
}