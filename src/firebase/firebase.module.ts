import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { FirebaseService } from './firebase.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useValue: firebaseApp,
    },
    FirebaseService,
  ],
  exports: ['FIREBASE_APP', FirebaseService],
})
export class FirebaseModule {}
