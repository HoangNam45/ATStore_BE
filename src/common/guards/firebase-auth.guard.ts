import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(@Inject('FIREBASE_APP') private firebaseApp: admin.app.App) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      // Verify the ID token with Firebase Admin SDK
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(idToken);

      // Check if user has admin role in custom claims
      if (decodedToken.role !== 'admin') {
        throw new UnauthorizedException('User does not have admin privileges');
      }

      // Attach user info to request for use in controllers
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
