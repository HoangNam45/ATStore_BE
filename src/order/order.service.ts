import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

interface BankInfo {
  accountNo: string;
  bankCode: string;
}

@Injectable()
export class OrderService {
  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Generate a unique 6-digit order ID (ORD[6 digits])
   */
  private generateOrderId(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `ORD${randomNum}`;
  }

  /**
   * Generate a unique checkout code (8 characters alphanumeric)
   */
  private generateCheckoutCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Check if order ID exists in database
   */
  private async checkOrderIdExists(orderId: string): Promise<boolean> {
    const firestore = this.firebaseService.getFirestore();
    const orderRef = firestore.collection('orders').doc(orderId);
    const doc = await orderRef.get();
    return doc.exists;
  }

  /**
   * Check if checkout code exists in database
   */
  private async checkCheckoutCodeExists(
    checkoutCode: string,
  ): Promise<boolean> {
    const firestore = this.firebaseService.getFirestore();
    const ordersRef = firestore.collection('orders');
    const snapshot = await ordersRef
      .where('checkoutCode', '==', checkoutCode)
      .get();
    return !snapshot.empty;
  }

  /**
   * Generate unique order ID (retry if exists)
   */
  private async generateUniqueOrderId(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const orderId = this.generateOrderId();
      const exists = await this.checkOrderIdExists(orderId);

      if (!exists) {
        return orderId;
      }

      attempts++;
    }

    throw new ConflictException(
      'Unable to generate unique order ID. Please try again.',
    );
  }

  /**
   * Generate unique checkout code (retry if exists)
   */
  private async generateUniqueCheckoutCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateCheckoutCode();
      const exists = await this.checkCheckoutCodeExists(code);

      if (!exists) {
        return code;
      }

      attempts++;
    }

    throw new ConflictException(
      'Unable to generate unique checkout code. Please try again.',
    );
  }

  /**
   * Generate Sepay QR code URL
   */
  private generateSepayQR(
    accountNo: string,
    amount: number,
    content: string,
    bankCode: string,
  ): string {
    const baseUrl = process.env.SEPAY_QR_API_URL || 'https://qr.sepay.vn/img';
    const params = new URLSearchParams({
      acc: accountNo,
      bank: bankCode,
      amount: amount.toString(),
      des: content,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Create a new order
   */
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      // Generate unique IDs
      const orderId = await this.generateUniqueOrderId();
      const checkoutCode = await this.generateUniqueCheckoutCode();

      // Set expiration time (45 minutes from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 45 * 60 * 1000);

      // Get bank info from environment variables
      const bankInfo: BankInfo = {
        accountNo: process.env.SEPAY_VIRTUAL_ACCOUNT || '96247VVHYNOL806',
        bankCode: process.env.SEPAY_BANK_CODE || 'BIDV',
      };

      // Generate QR code with Sepay
      const qrCodeUrl = this.generateSepayQR(
        bankInfo.accountNo,
        createOrderDto.totalPrice,
        checkoutCode,
        bankInfo.bankCode,
      );

      // Create order object
      const order: Order = {
        orderId,
        checkoutCode,
        accountId: createOrderDto.accountId,
        accountType: createOrderDto.accountType,
        categoryName: createOrderDto.categoryName,
        quantity: createOrderDto.quantity,
        unitPrice: createOrderDto.unitPrice,
        totalPrice: createOrderDto.totalPrice,
        email: createOrderDto.email,
        game: createOrderDto.game,
        server: createOrderDto.server,
        displayImage: createOrderDto.displayImage,
        userId: createOrderDto.userId,
        status: 'pending',
        qrCodeUrl,
        createdAt: now,
        expiresAt,
        updatedAt: now,
      };

      // Save to Firestore
      const firestore = this.firebaseService.getFirestore();
      await firestore.collection('orders').doc(orderId).set(order);

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const orderRef = firestore.collection('orders').doc(orderId);
      const doc = await orderRef.get();

      if (!doc.exists) {
        throw new BadRequestException(`Order not found: ${orderId}`);
      }

      return doc.data() as Order;
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch order: ${error.message}`);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
  ): Promise<void> {
    const firestore = this.firebaseService.getFirestore();
    const orderRef = firestore.collection('orders').doc(orderId);

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    await orderRef.update(updateData);
  }

  /**
   * Check and expire old orders (to be called by cron job)
   */
  async expireOldOrders(): Promise<void> {
    const firestore = this.firebaseService.getFirestore();
    const now = new Date();

    const ordersRef = firestore.collection('orders');
    const snapshot = await ordersRef
      .where('status', '==', 'pending')
      .where('expiresAt', '<=', now)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: now,
      });
    });

    await batch.commit();
  }
}
