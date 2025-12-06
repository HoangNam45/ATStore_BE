export class Order {
  orderId: string; // ORD[6 digits]
  checkoutCode: string; // Unique code for payment verification
  accountId: string;
  accountType: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  email: string;
  game: string;
  server: string;
  displayImage: string;
  userId?: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  qrCodeUrl?: string;
  createdAt: Date;
  expiresAt: Date;
  paidAt?: Date;
  updatedAt: Date;
}
