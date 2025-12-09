import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseUserGuard implements CanActivate {
  constructor(@Inject('FIREBASE_APP') private firebaseApp: admin.app.App) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    console.log('Auth Header:', authHeader);

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

      // Attach user info to request for use in controllers
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
