import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { EncryptionService } from '../common/services/encryption.service';

@Module({
  imports: [FirebaseModule],
  controllers: [AccountController],
  providers: [AccountService, EncryptionService],
  exports: [AccountService],
})
export class AccountModule {}
