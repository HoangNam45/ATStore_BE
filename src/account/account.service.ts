import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateAccountDto } from './dto';

@Injectable()
export class AccountService {
  private firestore: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: admin.app.App) {
    this.firestore = this.firebaseApp.firestore();
    this.storage = this.firebaseApp.storage();
  }

  async createAccount(data: CreateAccountDto) {
    // Upload display image to Firebase Storage
    const displayImageUrl = await this.uploadImage(
      data.displayImage,
      `accounts/${data.game}/display`,
    );

    // Upload detail images
    const detailImageUrls = await Promise.all(
      data.detailImages.map((file) =>
        this.uploadImage(file, `accounts/${data.game}/details`),
      ),
    );

    // Create account document in Firestore
    const accountData = {
      game: data.game,
      server: data.server || null,
      type: data.type,
      displayImage: displayImageUrl,
      detailImages: detailImageUrls,
      categories: data.categories,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await this.firestore.collection('accounts').add(accountData);

    return {
      id: docRef.id,
      ...accountData,
    };
  }

  private async uploadImage(
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
}
