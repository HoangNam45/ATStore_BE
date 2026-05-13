import { Injectable, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { Menu } from './entities/menu.entity';
import * as admin from 'firebase-admin';

@Injectable()
export class MenuService {
  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Create a new menu item with image
   */
  async createMenu(
    createMenuDto: CreateMenuDto,
    imageFile: Express.Multer.File,
  ): Promise<Menu> {
    if (!imageFile) {
      throw new BadRequestException('Vui lòng chọn ảnh món ăn.');
    }

    // Validate image file
    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedImageTypes.includes(imageFile.mimetype)) {
      throw new BadRequestException(
        'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.',
      );
    }

    // Upload image to Firebase Storage
    const imageUrl = await this.firebaseService.uploadImage(
      imageFile,
      'menu-items',
    );

    // Create menu document in Firestore
    const firestore = this.firebaseService.getFirestore();
    const menuId = firestore.collection('menu').doc().id;

    const menuData: any = {
      id: menuId,
      name: createMenuDto.name,
      price: createMenuDto.price,
      category: createMenuDto.category,
      imageUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestore.collection('menu').doc(menuId).set(menuData);

    // Return the created menu
    return {
      ...menuData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get all menu items
   */
  async getAllMenus(): Promise<Menu[]> {
    const firestore = this.firebaseService.getFirestore();
    const snapshot = await firestore.collection('menu').get();

    const menus: Menu[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      menus.push({
        id: data.id,
        name: data.name,
        price: data.price,
        category: data.category,
        imageUrl: data.imageUrl,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
      });
    });

    return menus;
  }

  /**
   * Get menu items by category
   */
  async getMenusByCategory(category: string): Promise<Menu[]> {
    const firestore = this.firebaseService.getFirestore();
    const snapshot = await firestore
      .collection('menu')
      .where('category', '==', category)
      .get();

    const menus: Menu[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      menus.push({
        id: data.id,
        name: data.name,
        price: data.price,
        category: data.category,
        imageUrl: data.imageUrl,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
      });
    });

    return menus;
  }

  /**
   * Get a single menu item by ID
   */
  async getMenuById(menuId: string): Promise<Menu | null> {
    const firestore = this.firebaseService.getFirestore();
    const doc = await firestore.collection('menu').doc(menuId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      category: data.category,
      imageUrl: data.imageUrl,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
    };
  }

  /**
   * Update a menu item
   */
  async updateMenu(
    menuId: string,
    updateData: Partial<CreateMenuDto>,
    imageFile?: Express.Multer.File,
  ): Promise<Menu> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('menu').doc(menuId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new BadRequestException('Không tìm thấy món ăn.');
    }

    let updateObj: any = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // If new image is provided, upload it and delete the old one
    if (imageFile) {
      const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ];
      if (!allowedImageTypes.includes(imageFile.mimetype)) {
        throw new BadRequestException(
          'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.',
        );
      }

      // Upload new image
      const newImageUrl = await this.firebaseService.uploadImage(
        imageFile,
        'menu-items',
      );

      // Delete old image
      const oldData = doc.data();
      if (oldData?.imageUrl) {
        await this.firebaseService.deleteImage(oldData.imageUrl);
      }

      updateObj.imageUrl = newImageUrl;
    }

    await docRef.update(updateObj);

    // Return updated menu
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data()!;
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      category: data.category,
      imageUrl: data.imageUrl,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
    };
  }

  /**
   * Delete a menu item
   */
  async deleteMenu(menuId: string): Promise<void> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('menu').doc(menuId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new BadRequestException('Không tìm thấy món ăn.');
    }

    // Delete image from Firebase Storage
    const data = doc.data();
    if (data?.imageUrl) {
      await this.firebaseService.deleteImage(data.imageUrl);
    }

    // Delete document from Firestore
    await docRef.delete();
  }
}
