import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useValue: firebaseApp,
    },
  ],
  exports: ['FIREBASE_APP'],
})
export class FirebaseModule {}
