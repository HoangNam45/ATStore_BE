import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateAccountDto } from './dto';
import { EncryptionService } from '../common/services/encryption.service';
import { FirebaseService } from '../firebase/firebase.service';
import { v4 as uuidv4 } from 'uuid';

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

    // Encrypt account credentials in categories and generate IDs
    const encryptedCategories = categoriesArray.map((category) => ({
      id: uuidv4(),
      name: category.name,
      price: category.price,
      accounts: category.accounts.map((account) => {
        const encrypted = this.encryptionService.encryptCredentials(
          account.username,
          account.password,
        );
        return {
          id: uuidv4(),
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

      // Calculate total available account count across all categories
      const totalAccountCount = Array.isArray(categories)
        ? categories.reduce(
            (
              total: number,
              category: { accounts?: Array<{ status?: string }> },
            ) => {
              const availableCount =
                category.accounts?.filter(
                  (acc) => !acc.status || acc.status === 'available',
                ).length || 0;
              return total + availableCount;
            },
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
                accounts?: Array<{ status?: string }>;
              }) => {
                // Count only available accounts
                const availableCount =
                  category.accounts?.filter(
                    (acc) => !acc.status || acc.status === 'available',
                  ).length || 0;

                return {
                  name: category.name,
                  price: category.price,
                  accountCount: availableCount,
                };
              },
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
              accounts?: Array<{ status?: string }>;
            }) => {
              // Count only available accounts
              const availableCount =
                category.accounts?.filter(
                  (acc) => !acc.status || acc.status === 'available',
                ).length || 0;

              return {
                name: category.name,
                price: category.price,
                accountCount: availableCount,
              };
            },
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
              id?: string;
              name: string;
              price: number;
              accounts?: Array<{
                id?: string;
                username: string;
                password: string;
                status?: string;
              }>;
            }) => ({
              id: category.id || uuidv4(),
              name: category.name,
              price: category.price,
              accounts: (category.accounts || []).map((account, index) => {
                try {
                  const decrypted = this.encryptionService.decryptCredentials(
                    account.username,
                    account.password,
                  );
                  return {
                    id: account.id || `${doc.id}_${category.name}_${index}`,
                    username: decrypted.username,
                    password: decrypted.password,
                    price: category.price,
                    status: account.status || 'available',
                  };
                } catch (error) {
                  console.error('Error decrypting credentials:', error);
                  return {
                    id: account.id || `${doc.id}_${category.name}_${index}`,
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
    const categories: Array<{
      id?: string;
      name: string;
      price: number;
      accounts?: Array<unknown>;
    }> = data?.categories || [];

    const updatedCategories = categories.map((cat) => {
      if (cat.id === categoryId) {
        return { ...cat, name, price };
      }
      return cat;
    });

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
    const categories: Array<{
      id?: string;
      name: string;
      price?: number;
      accounts: Array<{
        id?: string;
        username: string;
        password: string;
        status?: string;
      }>;
    }> = data?.categories || [];

    const updatedCategories = categories.map((cat) => {
      if (cat.id === categoryId) {
        const updatedAccounts = cat.accounts.map((acc) => {
          if (acc.id === accountId) {
            // Encrypt new credentials
            const encrypted = this.encryptionService.encryptCredentials(
              username,
              password,
            );
            return {
              ...acc,
              username: encrypted.username,
              password: encrypted.password,
              status: status,
            };
          }
          return acc;
        });
        return { ...cat, accounts: updatedAccounts };
      }
      return cat;
    });

    await docRef.update({
      categories: updatedCategories,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Account updated successfully' };
  }

  async addAccountToCategory(
    listId: string,
    categoryId: string,
    username: string,
    password: string,
    ownerId: string,
  ) {
    const docRef = this.firestore.collection('accounts').doc(listId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Account list not found');
    }

    const data = doc.data();
    if (data?.ownerId !== ownerId) {
      throw new Error('Unauthorized');
    }

    const categories: Array<{
      id?: string;
      name: string;
      accounts: Array<unknown>;
    }> = data?.categories || [];
    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);

    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }

    // Encrypt credentials
    const encrypted = this.encryptionService.encryptCredentials(
      username,
      password,
    );

    const updatedCategories = categories.map((cat, idx) => {
      if (idx === categoryIndex) {
        return {
          ...cat,
          accounts: [
            ...cat.accounts,
            {
              id: uuidv4(),
              username: encrypted.username,
              password: encrypted.password,
              status: 'available',
            },
          ],
        };
      }
      return cat;
    });

    await docRef.update({
      categories: updatedCategories,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Account added successfully' };
  }

  async deleteAccount(
    listId: string,
    categoryId: string,
    accountId: string,
    ownerId: string,
  ) {
    const docRef = this.firestore.collection('accounts').doc(listId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Account list not found');
    }

    const data = doc.data();
    if (data?.ownerId !== ownerId) {
      throw new Error('Unauthorized');
    }

    const categories: Array<{ id?: string; accounts: Array<{ id?: string }> }> =
      data?.categories || [];
    const categoryIndex = categories.findIndex((cat) => cat.id === categoryId);

    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }

    const updatedCategories = categories.map((cat, idx) => {
      if (idx === categoryIndex) {
        const updatedAccounts = cat.accounts.filter(
          (acc) => acc.id !== accountId,
        );
        return { ...cat, accounts: updatedAccounts };
      }
      return cat;
    });

    await docRef.update({
      categories: updatedCategories,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Account deleted successfully' };
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

  /**
   * Get oldest available account from category and mark as sold
   */
  async getAndMarkAccountAsSold(
    accountId: string,
    categoryName: string,
  ): Promise<{ username: string; password: string } | null> {
    const docRef = this.firestore.collection('accounts').doc(accountId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    const categories: Array<{
      name: string;
      accounts: Array<{
        username: string;
        password: string;
        status?: string;
      }>;
    }> = data?.categories || [];

    // Find the category
    const categoryIndex = categories.findIndex(
      (cat) => cat.name === categoryName,
    );

    if (categoryIndex === -1) {
      return null;
    }

    const category = categories[categoryIndex];

    // Find the first available account (oldest)
    const accountIndex = category.accounts.findIndex(
      (acc) => !acc.status || acc.status === 'available',
    );

    if (accountIndex === -1) {
      return null;
    }

    const account = category.accounts[accountIndex];

    // Decrypt credentials
    const decrypted = this.encryptionService.decryptCredentials(
      account.username,
      account.password,
    );

    // Update account status to sold
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...category,
      accounts: category.accounts.map((acc, idx) =>
        idx === accountIndex ? { ...acc, status: 'sold' } : acc,
      ),
    };

    await docRef.update({
      categories: updatedCategories,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return decrypted;
  }

  /**
   * Get dashboard statistics for owner
   */
  async getDashboardStats(ownerId: string) {
    const snapshot = await this.firestore
      .collection('accounts')
      .where('ownerId', '==', ownerId)
      .get();

    let totalAccounts = 0;
    let soldAccounts = 0;
    const gameStats: Record<
      string,
      { total: number; sold: number; name: string }
    > = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const game = data.game;
      const categories: Array<{
        accounts: Array<{ status?: string }>;
      }> = data.categories || [];

      categories.forEach((category) => {
        const accounts = category.accounts || [];
        accounts.forEach((account) => {
          totalAccounts++;
          if (account.status === 'sold') {
            soldAccounts++;
          }

          if (!gameStats[game]) {
            gameStats[game] = { name: game, total: 0, sold: 0 };
          }
          gameStats[game].total++;
          if (account.status === 'sold') {
            gameStats[game].sold++;
          }
        });
      });
    });

    // Get revenue from orders
    const ordersSnapshot = await this.firestore
      .collection('orders')
      .where('status', '==', 'paid')
      .get();

    let totalRevenue = 0;
    const gameRevenue: Record<string, number> = {};

    ordersSnapshot.docs.forEach((doc) => {
      const order = doc.data();
      totalRevenue += order.totalPrice || 0;

      const game = order.game;
      if (!gameRevenue[game]) {
        gameRevenue[game] = 0;
      }
      gameRevenue[game] += order.totalPrice || 0;
    });

    // Combine stats
    const gameStatsArray = Object.values(gameStats).map((stat) => ({
      ...stat,
      revenue: gameRevenue[stat.name] || 0,
    }));

    return {
      totalAccounts,
      soldAccounts,
      revenue: totalRevenue,
      gameStats: gameStatsArray,
    };
  }
}
