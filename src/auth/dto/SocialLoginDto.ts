import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class SocialLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsString()
  @IsNotEmpty()
  provider: 'google' | 'facebook';

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  photoURL?: string;
}
