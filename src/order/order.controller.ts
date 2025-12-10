import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { FirebaseUserGuard } from '../common/guards/firebase-user.guard';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.orderService.createOrder(createOrderDto);
  }

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string): Promise<Order> {
    return this.orderService.getOrder(orderId);
  }

  @UseGuards(FirebaseUserGuard)
  @Get('user/my-orders')
  async getUserOrders(@Request() req): Promise<Order[]> {
    const userId = req.user.uid;
    return this.orderService.getUserOrders(userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('admin/all-orders')
  async getAllOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.orderService.getAllOrders({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      startDate,
      endDate,
    });
  }

  @Post('webhook/payment')
  async handlePaymentWebhook(
    @Body() webhookData: any,
    @Headers('authorization') authorization?: string,
  ): Promise<{ success: boolean; message: string; orderId?: string }> {
    return this.orderService.handlePaymentWebhook(webhookData, authorization);
  }
}
