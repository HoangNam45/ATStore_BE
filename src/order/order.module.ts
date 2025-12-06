import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { AccountModule } from '../account/account.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [FirebaseModule, AccountModule, EmailModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
