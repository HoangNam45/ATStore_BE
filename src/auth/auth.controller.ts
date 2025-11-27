import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, VerifyEmailDto, LoginDto, SocialLoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() dto: SignUpDto) {
    const user = await this.authService.signUp(dto);
    return user;
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-otp')
  async resendOtp(@Body('email') email: string) {
    return this.authService.resendOtp(email);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('social-login')
  async socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }
}
