import { IsString, IsNumber, IsNotEmpty, IsEnum, Min } from 'class-validator';

export enum MenuCategory {
  COFFEE = 'coffee',
  MILK_TEA = 'milk-tea',
  MATCHA = 'matcha',
  TEA = 'tea',
  COLDBREW = 'coldbrew',
  SPECIAL = 'special',
}

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @IsEnum(MenuCategory)
  @IsNotEmpty()
  category: MenuCategory;
}
