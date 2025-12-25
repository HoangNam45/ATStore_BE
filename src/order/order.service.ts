import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { AccountService } from '../account/account.service';
import { EmailService } from '../email/email.service';

interface BankInfo {
  accountNo: string;
  bankCode: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly accountService: AccountService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generate a unique 6-digit order ID (ORD[6 digits])
   */
  private generateOrderId(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `ORD${randomNum}`;
  }

  /**
   * Generate a unique checkout code (AT + 6 digits)
   */
  private generateCheckoutCode(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `AT${randomNum}`;
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

      // Build payment content following Sepay requirement: SEVQR TKPAT1 + checkout code
      const paymentContent = `SEVQR TKPAT1 ${checkoutCode}`;

      // Generate QR code with Sepay
      const qrCodeUrl = this.generateSepayQR(
        bankInfo.accountNo,
        createOrderDto.totalPrice,
        paymentContent,
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
        server: createOrderDto.server ?? '',
        displayImage: createOrderDto.displayImage,
        status: 'pending',
        qrCodeUrl,
        createdAt: now,
        expiresAt,
        updatedAt: now,
      };

      // Only include userId if present to avoid Firestore undefined error
      if (createOrderDto.userId) {
        (order as any).userId = createOrderDto.userId;
      }

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
   * Get all orders for a specific user
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const ordersRef = firestore.collection('orders');

      const snapshot = await ordersRef
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc) => doc.data() as Order);
    } catch (error) {
      console.error(`Error fetching user orders:`, error);
      throw new BadRequestException(
        `Failed to fetch user orders: ${error.message}`,
      );
    }
  }

  /**
   * Get all orders for admin with filtering, search, and pagination
   */
  async getAllOrders(params: {
    page: number;
    limit: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const ordersRef = firestore.collection('orders');

      // Build query for paid orders only
      let query = ordersRef.where('status', '==', 'paid');

      // Apply date filters
      if (params.startDate) {
        const startDate = new Date(params.startDate);
        query = query.where('createdAt', '>=', startDate);
      }

      if (params.endDate) {
        const endDate = new Date(params.endDate);
        endDate.setHours(23, 59, 59, 999);
        query = query.where('createdAt', '<=', endDate);
      }

      // Order by createdAt descending
      query = query.orderBy('createdAt', 'desc');

      // Get all matching documents
      const snapshot = await query.get();

      let allOrders = snapshot.docs.map((doc) => doc.data() as Order);

      // Apply search filter (client-side since Firestore doesn't support OR queries efficiently)
      if (params.search && params.search.trim() !== '') {
        const searchLower = params.search.toLowerCase().trim();
        allOrders = allOrders.filter(
          (order) =>
            order.orderId.toLowerCase().includes(searchLower) ||
            order.email.toLowerCase().includes(searchLower) ||
            order.game.toLowerCase().includes(searchLower) ||
            order.accountType.toLowerCase().includes(searchLower),
        );
      }

      // Calculate pagination
      const total = allOrders.length;
      const totalPages = Math.ceil(total / params.limit);
      const startIndex = (params.page - 1) * params.limit;
      const endIndex = startIndex + params.limit;

      // Get paginated orders
      const paginatedOrders = allOrders.slice(startIndex, endIndex);

      return {
        orders: paginatedOrders,
        total,
        page: params.page,
        limit: params.limit,
        totalPages,
      };
    } catch (error) {
      console.error(`Error fetching all orders:`, error);
      throw new BadRequestException(`Failed to fetch orders: ${error.message}`);
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

  /**
   * Delete expired orders older than 1 week (to be called by cron job)
   */
  async deleteOldExpiredOrders(): Promise<number> {
    const firestore = this.firebaseService.getFirestore();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const ordersRef = firestore.collection('orders');
    const snapshot = await ordersRef
      .where('status', '==', 'expired')
      .where('updatedAt', '<=', oneWeekAgo)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    // Firestore batch limit is 500 operations
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = firestore.batch();
      const batchDocs = snapshot.docs.slice(i, i + batchSize);

      batchDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += batchDocs.length;
    }

    return deletedCount;
  }

  /**
   * Handle Sepay webhook for payment confirmation
   */
  async handlePaymentWebhook(
    webhookData: any,
    authorization?: string,
  ): Promise<{
    success: boolean;
    message: string;
    orderId?: string;
  }> {
    try {
      // Verify API key from Authorization header
      const expectedApiKey = process.env.SEPAY_API_KEY;
      if (!authorization) {
        throw new BadRequestException('Missing Authorization header');
      }

      // Extract API key from "Apikey YOUR_KEY" format
      const apiKeyMatch = authorization.match(/^Apikey\s+(.+)$/i);
      if (!apiKeyMatch) {
        throw new BadRequestException('Invalid Authorization format');
      }

      const providedApiKey = apiKeyMatch[1];
      if (providedApiKey !== expectedApiKey) {
        throw new BadRequestException('Invalid API key');
      }

      const { content, transferAmount } = webhookData;

      if (!content || typeof content !== 'string') {
        throw new BadRequestException('Missing or invalid payment content');
      }

      const normalizedContent = content.trim();
      const normalizedUpper = normalizedContent.toUpperCase();

      // Content must contain SEVQR (position can vary depending on bank prefix)
      if (!normalizedUpper.includes('SEVQR')) {
        throw new BadRequestException('Payment content must include SEVQR');
      }

      // Content must contain the sub-account marker TKPAT1
      if (!normalizedUpper.includes('TKPAT1')) {
        throw new BadRequestException(
          'Payment content must include sub-account marker TKPAT1',
        );
      }

      // Extract checkout code from content (format: AT123456)
      const checkoutCodeMatch = normalizedUpper.match(/AT\d{6}/);
      if (!checkoutCodeMatch) {
        throw new BadRequestException('Invalid checkout code format');
      }

      const checkoutCode = checkoutCodeMatch[0];
      const paidAmount = transferAmount;

      if (!paidAmount || paidAmount <= 0) {
        throw new BadRequestException('Invalid payment amount');
      }

      // Find order by checkout code (outside transaction to minimize scope)
      const firestore = this.firebaseService.getFirestore();
      const ordersRef = firestore.collection('orders');
      const snapshot = await ordersRef
        .where('checkoutCode', '==', checkoutCode)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new BadRequestException(
          `No pending order found with checkout code: ${checkoutCode}`,
        );
      }

      const orderDoc = snapshot.docs[0];
      const order = orderDoc.data() as Order;

      // Verify payment amount
      if (paidAmount < order.totalPrice) {
        throw new BadRequestException(
          `Insufficient payment amount. Expected: ${order.totalPrice}, Received: ${paidAmount}`,
        );
      }

      // TRANSACTION: Update order status and mark account as sold atomically
      let accountCredentials: any = null;

      await firestore.runTransaction(async (transaction) => {
        // Get and mark account as sold within transaction
        accountCredentials = await this.accountService.getAndMarkAccountAsSold(
          order.accountId,
          order.categoryName,
          transaction,
        );

        if (!accountCredentials) {
          throw new BadRequestException('No available account found');
        }

        // Update order status to paid within transaction
        transaction.update(orderDoc.ref, {
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
          paidAmount: paidAmount,
        });
      });

      // Send email OUTSIDE transaction (can fail without rolling back order payment)
      try {
        await this.emailService.sendAccountDeliveryEmail(
          order.email,
          order.checkoutCode,
          `${order.game} - ${order.categoryName}`,
          accountCredentials.username,
          accountCredentials.password,
        );
      } catch (emailError) {
        console.error('Error sending account delivery email:', emailError);
        // Don't throw - email can be retried later, order payment is already confirmed
      }

      return {
        success: true,
        message: 'Payment confirmed successfully',
        orderId: order.orderId,
      };
    } catch (error) {
      console.error('Error handling payment webhook:', error);
      throw error;
    }
  }
}
