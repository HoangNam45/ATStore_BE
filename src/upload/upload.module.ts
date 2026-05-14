import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [FirebaseModule],
  controllers: [UploadController],
})
export class UploadModule {}
