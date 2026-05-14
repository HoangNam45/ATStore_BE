import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  contentHtml: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  coverImageUrl?: string | null;
}
