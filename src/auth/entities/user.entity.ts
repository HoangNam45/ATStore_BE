export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providers: Array<'email' | 'google' | 'facebook'>; // Multiple providers support
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
