export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  provider: 'email' | 'google' | 'facebook';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
