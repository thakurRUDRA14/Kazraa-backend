import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateAddressDto {
    @IsString()
    @Length(2, 100)
    fullName!: string;

    @IsString()
    @Length(10, 15)
    phone!: string;

    @IsString()
    @Length(2, 255)
    addressLine1!: string;

    @IsOptional()
    @IsString()
    @Length(2, 255)
    addressLine2?: string;

    @IsOptional()
    @IsString()
    @Length(2, 100)
    landmark?: string;

    @IsString()
    @Length(2, 100)
    city!: string;

    @IsOptional()
    @IsString()
    @Length(2, 100)
    district?: string;

    @IsString()
    @Length(2, 100)
    state!: string;

    @IsOptional()
    @IsString()
    @Length(2, 100)
    country?: string;

    @IsString()
    @Length(4, 10)
    postalCode!: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}