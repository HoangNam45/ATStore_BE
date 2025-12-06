import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

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

  @Post('webhook/payment')
  async handlePaymentWebhook(
    @Body() webhookData: any,
    @Headers('authorization') authorization?: string,
  ): Promise<{ success: boolean; message: string; orderId?: string }> {
    return this.orderService.handlePaymentWebhook(webhookData, authorization);
  }
}
