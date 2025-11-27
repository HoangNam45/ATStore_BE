import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendOTPEmail(email: string, otp: string, username: string | undefined) {
    const displayName = username || 'Khách hàng';
    const mailOptions = {
      from: `"AT Store" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: email,
      subject: 'Mã xác thực tài khoản - QTAT Shop',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Xác thực tài khoản</h2>
          <p>Xin chào <strong>${displayName}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại QTAT Shop. Để hoàn tất quá trình đăng ký, vui lòng nhập mã xác thực sau:</p>
          <div style="background-color: #fdf2f8; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #fce7f3;">
            <h1 style="color: #ec4899; font-size: 32px; margin: 0; letter-spacing: 8px; text-shadow: 0 2px 4px rgba(236, 72, 153, 0.2);">${otp}</h1>
          </div>
          <p><strong>Lưu ý:</strong> Mã xác thực này sẽ hết hạn sau 10 phút.</p>
          <p>Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Email này được gửi tự động, vui lòng không trả lời.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
