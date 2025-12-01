import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Redis } from 'ioredis';
import { SignUpDto } from './dto/SignUpDto';
import { VerifyEmailDto } from './dto/VerifyEmailDto';
import { LoginDto } from './dto/LoginDto';
import { SocialLoginDto } from './dto/SocialLoginDto';
import { EmailService } from '../email/email.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
    private emailService: EmailService,
    private firebaseService: FirebaseService,
  ) {}

  //  Generate a 6-digit OTP code
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async signUp(dto: SignUpDto) {
    const { email, password, user_name } = dto;
    try {
      // Check if user already exists in Firebase
      try {
        await this.firebaseApp.auth().getUserByEmail(email);
        throw new ConflictException('User with this email already exists');
      } catch (error: any) {
        // If user doesn't exist, continue with registration
        if (error?.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Create user in Firebase (disabled until email is verified)
      const userRecord = await this.firebaseApp.auth().createUser({
        email,
        password,
        displayName: user_name,
        disabled: true, // User is disabled until email is verified
      });

      // Generate OTP
      const otp = this.generateOtp();
      // Store OTP in Redis with 10 minutes expiry
      const cacheKey = `atstore:otp:${email}`;
      await this.redisClient.setex(cacheKey, 600, otp); // 600 seconds = 10 minutes
      // Send OTP via email
      await this.emailService.sendOTPEmail(email, otp, user_name);

      return {
        userId: userRecord.uid,
        email: userRecord.email,
      };
    } catch (error: any) {
      // If user creation failed, clean up
      if (error?.code === 'auth/email-already-exists') {
        throw new ConflictException('User with this email already exists');
      }
      throw new BadRequestException(
        error?.message || 'Failed to register user',
      );
    }
  }

  /**
   * Verify email using OTP code
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const { email, otp } = dto;

    try {
      // Get OTP from Redis
      const cacheKey = `atstore:otp:${email}`;
      const storedOtp = await this.redisClient.get(cacheKey);

      if (!storedOtp) {
        throw new BadRequestException('OTP has expired or does not exist');
      }

      // Verify OTP
      if (storedOtp !== otp) {
        throw new UnauthorizedException('Invalid OTP code');
      }

      // Get user from Firebase
      const user = await this.firebaseApp.auth().getUserByEmail(email);

      // Enable the user account
      await this.firebaseApp.auth().updateUser(user.uid, {
        disabled: false,
        emailVerified: true,
      });

      // Create user document in Firestore
      await this.firebaseService.getOrCreateUser(
        user.uid,
        user.email!,
        user.displayName || 'User',
        'email',
      );

      // Delete OTP from Redis
      await this.redisClient.del(cacheKey);

      // Generate custom token for authentication
      // const customToken = await this.firebaseApp
      //   .auth()
      //   .createCustomToken(user.uid);

      return {
        message: 'Email verified successfully. Your account is now active.',
        userId: user.uid,
        email: user.email,
        // token: customToken,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to verify email');
    }
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto) {
    const { email } = dto;

    try {
      // Verify user exists in Firebase Auth
      const user = await this.firebaseApp.auth().getUserByEmail(email);

      // Check if user is disabled
      if (user.disabled) {
        throw new UnauthorizedException(
          'Account is disabled. Please verify your email first.',
        );
      }

      // Note: Firebase Admin SDK cannot verify passwords directly
      // The frontend should use Firebase Client SDK to sign in
      // This endpoint is for creating/updating user in Firestore after successful client-side auth

      // Get or create user in Firestore
      const userData = await this.firebaseService.getOrCreateUser(
        user.uid,
        user.email!,
        user.displayName || 'User',
        'email',
        user.photoURL || undefined,
      );

      // Generate custom token
      // const customToken = await this.firebaseApp
      //   .auth()
      //   .createCustomToken(user.uid);

      return {
        message: 'Login successful',
        user: userData,
        // token: customToken,
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error?.code === 'auth/user-not-found') {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw new BadRequestException('Failed to login');
    }
  }

  /**
   * Social login (Google/Facebook)
   */
  async socialLogin(dto: SocialLoginDto) {
    const { idToken, provider } = dto;

    try {
      // Verify the ID token
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(idToken);

      // Get user from Firebase Auth
      const user = await this.firebaseApp.auth().getUser(decodedToken.uid);

      // Get or create user in Firestore
      const userData = await this.firebaseService.getOrCreateUser(
        user.uid,
        user.email!,
        user.displayName || dto.displayName || 'User',
        provider,
        user.photoURL || dto.photoURL || undefined,
      );

      // Generate custom token
      // const customToken = await this.firebaseApp
      //   .auth()
      //   .createCustomToken(user.uid);

      return {
        message: 'Login successful',
        user: userData,
      };
    } catch (error: any) {
      if (error?.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Token expired. Please login again.');
      }
      if (error?.code === 'auth/invalid-id-token') {
        throw new UnauthorizedException('Invalid token');
      }
      throw new BadRequestException(
        'Failed to authenticate with social provider',
      );
    }
  }

  /**
   * Resend OTP code
   */
  async resendOtp(email: string) {
    try {
      // Check if user exists
      const user = await this.firebaseApp.auth().getUserByEmail(email);

      // Check if user is already verified
      if (!user.disabled && user.emailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Generate new OTP
      const otp = this.generateOtp();

      // Store OTP in Redis with 10 minutes expiry
      const cacheKey = `atstore:otp:${email}`;
      await this.redisClient.setex(cacheKey, 600, otp); // 600 seconds

      // Send OTP via email
      await this.emailService.sendOTPEmail(email, otp, user.displayName);

      return {
        message: 'OTP code has been resent to your email',
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error?.code === 'auth/user-not-found') {
        throw new BadRequestException('User not found');
      }
      throw new BadRequestException('Failed to resend OTP');
    }
  }
}
