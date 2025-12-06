import {
  IsString,
  IsNumber,
  IsEmail,
  IsNotEmpty,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  accountType: string;

  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  game: string;

  @IsString()
  @IsNotEmpty()
  server: string;

  @IsString()
  displayImage: string;

  @IsString()
  @IsOptional()
  userId?: string; // Optional, will be set from auth if user is logged in
}
