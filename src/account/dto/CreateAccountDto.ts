import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class AccountCredentialDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class CategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccountCredentialDto)
  accounts: AccountCredentialDto[];
}

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  game: string;

  @IsString()
  @IsOptional()
  server?: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories: CategoryDto[] | string; // Allow string for JSON parsing

  // Files will be added separately by controller after validation
  displayImage?: Express.Multer.File;
  detailImages?: Express.Multer.File[];
}
