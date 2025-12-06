import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { OrderModule } from './order/order.module';
import { TasksModule } from './tasks/tasks.module';
import { MorganMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    FirebaseModule,
    RedisModule,
    AuthModule,
    AccountModule,
    OrderModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MorganMiddleware).forRoutes('*');
  }
}
