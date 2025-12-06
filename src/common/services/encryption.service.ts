import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }
    this.encryptionKey = key;
  }

  /**
   * Encrypt a string using AES encryption
   */
  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  /**
   * Decrypt an AES encrypted string
   */
  decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Encrypt account credentials (username and password)
   */
  encryptCredentials(username: string, password: string) {
    return {
      username: this.encrypt(username),
      password: this.encrypt(password),
    };
  }

  /**
   * Decrypt account credentials (username and password)
   */
  decryptCredentials(encryptedUsername: string, encryptedPassword: string) {
    return {
      username: this.decrypt(encryptedUsername),
      password: this.decrypt(encryptedPassword),
    };
  }
}
