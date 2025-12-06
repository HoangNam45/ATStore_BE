import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateAccountDto } from './dto';
import { EncryptionService } from '../common/services/encryption.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AccountService {
  private firestore: admin.firestore.Firestore;

  constructor(
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App,
    private encryptionService: EncryptionService,
    private firebaseService: FirebaseService,
  ) {
    this.firestore = this.firebaseApp.firestore();
  }

  async createAccount(data: CreateAccountDto, ownerId?: string) {
    if (!data.displayImage) {
      throw new Error('Display image is required');
    }

    // Upload display image to Firebase Storage
    const displayImageUrl = await this.firebaseService.uploadImage(
      data.displayImage,
      `accounts/${data.game}/display`,
    );

    // Upload detail images
    const detailImageUrls = await Promise.all(
      (data.detailImages || []).map((file) =>
        this.firebaseService.uploadImage(file, `accounts/${data.game}/details`),
      ),
    );

    // Ensure categories is an array
    const categoriesArray = Array.isArray(data.categories)
      ? data.categories
      : [];

    // Encrypt account credentials in categories
    const encryptedCategories = categoriesArray.map((category) => ({
      ...category,
      accounts: category.accounts.map((account) => {
        const encrypted = this.encryptionService.encryptCredentials(
          account.username,
          account.password,
        );
        return {
          username: encrypted.username,
          password: encrypted.password,
          status: 'available',
        };
      }),
    }));

    // Create account document in Firestore
    const accountData = {
      game: data.game,
      server: data.server || null,
      type: data.type,
      displayImage: displayImageUrl,
      detailImages: detailImageUrls,
      categories: encryptedCategories,
      ownerId: ownerId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await this.firestore.collection('accounts').add(accountData);

    return {
      id: docRef.id,
      ...accountData,
    };
  }

  async getAccountsByGame(game: string) {
    const snapshot = await this.firestore
      .collection('accounts')
      .where('game', '==', game)
      .get();

    // Remove encrypted credentials from public response
    const accounts = snapshot.docs.map((doc) => {
      const data = doc.data();
      const categories = data.categories || [];

      // Calculate total account count across all categories
      const totalAccountCount = Array.isArray(categories)
        ? categories.reduce(
            (total: number, category: { accounts?: Array<unknown> }) =>
              total + (category.accounts?.length || 0),
            0,
          )
        : 0;

      return {
        id: doc.id,
        game: data.game,
        server: data.server,
        type: data.type,
        displayImage: data.displayImage,
        detailImages: data.detailImages,
        totalAccountCount,
        categories: Array.isArray(categories)
          ? categories.map(
              (category: {
                name: string;
                price: number;
                accounts?: Array<unknown>;
              }) => ({
                name: category.name,
                price: category.price,
                // Remove accounts array completely from public API
                accountCount: category.accounts?.length || 0,
              }),
            )
          : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return accounts;
  }

  async getAccountById(accountId: string) {
    const docRef = this.firestore.collection('accounts').doc(accountId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    const categories = data.categories || [];

    // Remove encrypted credentials from response
    return {
      id: doc.id,
      game: data.game,
      server: data.server,
      type: data.type,
      displayImage: data.displayImage,
      detailImages: data.detailImages,
      categories: Array.isArray(categories)
        ? categories.map(
            (category: {
              name: string;
              price: number;
              accounts?: Array<unknown>;
            }) => ({
              name: category.name,
              price: category.price,
              accountCount: category.accounts?.length || 0,
            }),
          )
        : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async getAccountsByOwner(ownerId: string) {
    const snapshot = await this.firestore
      .collection('accounts')
      .where('ownerId', '==', ownerId)
      .get();

    const accounts = snapshot.docs.map((doc) => {
      const data = doc.data();
      const categories = data.categories || [];

      // Decrypt credentials for owner
      const decryptedCategories = Array.isArray(categories)
        ? categories.map(
            (category: {
              name: string;
              price: number;
              accounts?: Array<{
                username: string;
                password: string;
                status?: string;
              }>;
            }) => ({
              id: `${doc.id}_${category.name}`,
              name: category.name,
              price: category.price,
              accounts: (category.accounts || []).map((account, index) => {
                try {
                  const decrypted = this.encryptionService.decryptCredentials(
                    account.username,
                    account.password,
                  );
                  return {
                    id: `${doc.id}_${category.name}_${index}`,
                    username: decrypted.username,
                    password: decrypted.password,
                    price: category.price,
                    status: account.status || 'available',
                  };
                } catch (error) {
                  console.error('Error decrypting credentials:', error);
                  return {
                    id: `${doc.id}_${category.name}_${index}`,
                    username: 'Error decrypting',
                    password: 'Error decrypting',
                    price: category.price,
                    status: account.status || 'available',
                  };
                }
              }),
            }),
          )
        : [];

      return {
        id: doc.id,
        name: data.type || 'Unknown',
        game: data.game,
        slug: this.getGameSlug(data.game),
        server: data.server,
        type: data.type,
        displayImage: data.displayImage,
        detailImages: data.detailImages,
        categories: decryptedCategories,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return accounts;
  }

  async updateListType(listId: string, type: string, ownerId: string) {
    const docRef = this.firestore.collection('accounts').doc(listId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.ownerId !== ownerId) {
      throw new Error('List not found or unauthorized');
    }

    await docRef.update({
      type,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'List type updated successfully' };
  }

  async updateCategory(
    listId: string,
    categoryId: string,
    name: string,
    price: number,
    ownerId: string,
  ) {
    const docRef = this.firestore.collection('accounts').doc(listId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.ownerId !== ownerId) {
      throw new Error('List not found or unauthorized');
    }

    const data = doc.data();
    const categories = data?.categories || [];

    const updatedCategories = categories.map(
      (cat: { name: string; price: number }) => {
        const catId = `${listId}_${cat.name}`;
        if (catId === categoryId) {
          return { ...cat, name, price };
        }
        return cat;
      },
    );

    await docRef.update({
      categories: updatedCategories,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Category updated successfully' };
  }

  async updateAccountCredentials(
    listId: string,
    categoryId: string,
    accountId: string,
    username: string,
    password: string,
    status: 'available' | 'sold',
    ownerId: string,
  ) {
    const docRef = this.firestore.collection('accounts').doc(listId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.ownerId !== ownerId) {
      throw new Error('List not found or unauthorized');
    }

    const data = doc.data();
    const categories = data?.categories || [];

    // Extract category name from categoryId
    const categoryName = categoryId.split('_').slice(1).join('_');
    // Extract account index from accountId
    const accountIndex = parseInt(accountId.split('_').pop() || '0');

    const updatedCategories = categories.map(
      (cat: {
        name: string;
        accounts: Array<{
          username: string;
          password: string;
          status?: string;
        }>;
      }) => {
        if (cat.name === categoryName) {
          const updatedAccounts = [...cat.accounts];
          if (updatedAccounts[accountIndex]) {
            // Encrypt new credentials
            const encrypted = this.encryptionService.encryptCredentials(
              username,
              password,
            );
            updatedAccounts[accountIndex] = {
              username: encrypted.username,
              password: encrypted.password,
              status: status,
            };
          }
          return { ...cat, accounts: updatedAccounts };
        }
        return cat;
      },
    );

    await docRef.update({
      categories: updatedCategories,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Account updated successfully' };
  }

  private getGameSlug(gameName: string): string {
    const slugMap: Record<string, string> = {
      'Project Sekai Colorful Stage Ft. Hatsune Miku': 'project-sekai',
      'BanG Dream! Girls Band Party!': 'bandori',
      'Uma Musume Pretty Derby': 'uma-musume',
      'Cookie Run: Kingdom': 'cookie-run-kingdom',
      'D4DJ Groovy Mix': 'd4dj',
      'Love and Deepspace': 'love-and-deepspace',
      'NIKKE: The Goddess of Victory': 'nikke',
      'Blue Archive': 'blue-archive',
    };
    return (
      slugMap[gameName] || gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );
  }
}
