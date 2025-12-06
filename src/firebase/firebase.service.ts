import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class FirebaseService {
  private firestore: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: admin.app.App) {
    this.firestore = this.firebaseApp.firestore();
    this.storage = this.firebaseApp.storage();
  }

  /**
   * Get or create user document in Firestore
   * Supports provider linking - if email exists, link new provider
   */
  async getOrCreateUser(
    uid: string,
    email: string,
    displayName: string,
    provider: 'email' | 'google' | 'facebook',
    photoURL?: string,
  ): Promise<User> {
    // First, check if a user with this email already exists
    const usersSnapshot = await this.firestore
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      // User with this email exists - link the provider
      const existingUserDoc = usersSnapshot.docs[0];
      const existingUser = existingUserDoc.data() as User;
      const userRef = this.firestore
        .collection('users')
        .doc(existingUserDoc.id);

      // Check if provider is already linked
      const providers = existingUser.providers || [];
      if (!providers.includes(provider)) {
        // Add new provider to the array
        await userRef.update({
          providers: admin.firestore.FieldValue.arrayUnion(provider),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Update photoURL if provided and not already set
          ...(photoURL && !existingUser.photoURL ? { photoURL } : {}),
        });
      } else {
        // Just update last login
        await userRef.update({
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Return updated user data
      const updatedDoc = await userRef.get();
      return updatedDoc.data() as User;
    }

    // No existing user with this email - check by UID
    const userRef = this.firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // User exists by UID, update last login and link provider if needed
      const userData = userDoc.data() as User;

      const providers = userData.providers || [];
      if (!providers.includes(provider)) {
        await userRef.update({
          providers: admin.firestore.FieldValue.arrayUnion(provider),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await userRef.update({
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const updatedDoc = await userRef.get();
      return updatedDoc.data() as User;
    } else {
      // Create new user document
      const newUser: any = {
        uid,
        email,
        displayName,
        providers: [provider], // Initialize with current provider
        emailVerified: provider !== 'email', // Social logins are auto-verified
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Only add photoURL if it exists
      if (photoURL) {
        newUser.photoURL = photoURL;
      }

      await userRef.set(newUser);

      // Return user with current timestamps
      const createdDoc = await userRef.get();
      return createdDoc.data() as User;
    }
  }

  /**
   * Get user by UID
   */
  async getUserByUid(uid: string): Promise<User | null> {
    const userDoc = await this.firestore.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return null;
    }

    return userDoc.data() as User;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const usersSnapshot = await this.firestore
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return null;
    }

    return usersSnapshot.docs[0].data() as User;
  }

  /**
   * Update user data
   */
  async updateUser(uid: string, data: Partial<User>): Promise<User | null> {
    const userRef = this.firestore.collection('users').doc(uid);

    await userRef.update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
      return null;
    }

    return updatedDoc.data() as User;
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<void> {
    await this.firestore.collection('users').doc(uid).delete();
  }

  /**
   * Upload file to Firebase Storage and return public URL
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const bucket = this.storage.bucket();
    const fileName = `${folder}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    // Make file publicly accessible
    await fileUpload.makePublic();

    // Return public URL
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }

  /**
   * Get Firestore instance
   */
  getFirestore(): admin.firestore.Firestore {
    return this.firestore;
  }
}
