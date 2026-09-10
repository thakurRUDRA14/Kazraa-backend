import { IsString, MaxLength } from 'class-validator';

export class ReturnOrderDto {
    @IsString()
    @MaxLength(500)
    reason!: string;
}