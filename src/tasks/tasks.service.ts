import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from '../order/order.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * Check for expired orders every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    this.logger.log('Checking for expired orders...');
    try {
      await this.orderService.expireOldOrders();
      this.logger.log('Expired orders check completed');
    } catch (error) {
      this.logger.error('Error checking expired orders:', error);
    }
  }
}
