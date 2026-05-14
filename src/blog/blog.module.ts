import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  imports: [FirebaseModule],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
