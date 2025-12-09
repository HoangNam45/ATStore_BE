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

  /**
   * Delete expired orders older than 1 week
   * Runs every day at 2:00 AM
   */
  @Cron('0 2 * * *')
  async handleDeleteOldExpiredOrders() {
    this.logger.log('Starting cleanup of old expired orders...');
    try {
      const deletedCount = await this.orderService.deleteOldExpiredOrders();
      this.logger.log(
        `Cleanup completed. Deleted ${deletedCount} expired orders older than 1 week`,
      );
    } catch (error) {
      this.logger.error('Error deleting old expired orders:', error);
    }
  }
}
