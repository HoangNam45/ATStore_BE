# Authentication Implementation

## Overview

This implementation provides complete authentication functionality with:

- Manual signup with email verification (OTP)
- Email/Password login
- Google OAuth login
- Facebook OAuth login
- User data storage in Firestore
- Role-based access (USER/ADMIN)

## Backend Structure

### Database Schema (Firestore)

Collection: `users`

```typescript
{
  uid: string;              // Firebase Auth UID
  email: string;            // User email
  displayName: string;      // Display name
  photoURL?: string;        // Profile picture URL
  role: 'user' | 'admin';   // User role (default: 'user')
  provider: 'email' | 'google' | 'facebook';  // Auth provider
  emailVerified: boolean;   // Email verification status
  createdAt: Date;          // Account creation timestamp
  updatedAt: Date;          // Last update timestamp
  lastLoginAt?: Date;       // Last login timestamp
}
```

### API Endpoints

#### 1. Signup (Manual Registration)

**POST** `/auth/signup`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "user_name": "John Doe"
}
```

Response: Creates disabled user, sends OTP via email

#### 2. Verify Email

**POST** `/auth/verify-email`

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

Response: Activates account, creates user in Firestore, returns token

#### 3. Login (Email/Password)

**POST** `/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response: Updates lastLoginAt, returns user data and token

#### 4. Social Login (Google/Facebook)

**POST** `/auth/social-login`

```json
{
  "idToken": "firebase_id_token",
  "provider": "google",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://..."
}
```

Response: Creates user if first time, updates lastLoginAt, returns user data and token

#### 5. Resend OTP

**POST** `/auth/resend-otp`

```json
{
  "email": "user@example.com"
}
```

## Frontend Usage

### Installation

```bash
npm install firebase
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Using the Login Hook

```typescript
import { useLogin } from '@/hooks/useLogin';

const {
  email,
  password,
  loading,
  error,
  remember,
  setEmail,
  setPassword,
  setRemember,
  handleEmailLogin,
  handleGoogleLogin,
  handleFacebookLogin,
} = useLogin();
```

### Authentication Flow

#### Manual Signup & Login

1. User signs up → OTP sent to email
2. User verifies email with OTP → Account activated, user created in Firestore
3. User logs in → Firebase Client SDK authenticates → Backend updates lastLoginAt
4. Token stored in localStorage/sessionStorage

#### Social Login (First Time)

1. User clicks Google/Facebook button
2. Firebase handles OAuth flow
3. Backend receives ID token
4. Backend creates user in Firestore with role='user'
5. Token stored, user redirected

#### Social Login (Returning User)

1. User clicks Google/Facebook button
2. Firebase handles OAuth flow
3. Backend receives ID token
4. Backend updates lastLoginAt in Firestore
5. Token stored, user redirected

## Security Notes

1. **Password Authentication**: The backend cannot directly verify passwords with Firebase Admin SDK. The frontend must use Firebase Client SDK to authenticate, then the backend stores/updates user data.

2. **Token Storage**:
   - Remember me checked: localStorage (persistent)
   - Remember me unchecked: sessionStorage (session only)

3. **Role Assignment**: All new users get `role: 'user'` by default. Admin role must be manually assigned in Firestore.

4. **Email Verification**: Only manual signups require email verification. Social logins are auto-verified.

## Firebase Setup

### Enable Authentication Providers

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable:
   - Email/Password
   - Google
   - Facebook (requires Facebook App ID and Secret)

### Firestore Rules (Example)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
      allow update: if request.auth != null &&
                       request.auth.uid == userId &&
                       !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']);
    }
  }
}
```

## Testing

### Manual Signup Flow

1. POST `/auth/signup` with email, password, user_name
2. Check email for OTP
3. POST `/auth/verify-email` with email and OTP
4. POST `/auth/login` with email and password

### Social Login Flow

1. Use frontend to initiate Google/Facebook login
2. Firebase Client SDK handles OAuth
3. Frontend receives user credential
4. Frontend sends ID token to `/auth/social-login`
5. Check Firestore for new user document

## Notes

- First-time social login users are automatically created in Firestore
- All users start with role='user'
- Admin role must be set manually in Firestore
- Tokens should be included in subsequent API requests via Authorization header
