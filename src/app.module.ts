import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { MorganMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [FirebaseModule, RedisModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MorganMiddleware).forRoutes('*');
  }
}
