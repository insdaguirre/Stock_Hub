# Authentication Setup for Stock Hub

## Overview
This document describes the authentication system implemented for Stock Hub, which protects the `/predict` page and requires users to log in before accessing prediction features.

## Features
- **User Registration & Login**: Username/email and password authentication
- **JWT Token Management**: Secure token-based sessions with 24-hour expiration
- **Password Security**: Bcrypt hashing with 12 rounds
- **Protected Routes**: `/predict` page requires authentication
- **Auto-logout**: Automatic logout on token expiration
- **Persistent Sessions**: Login state persists across browser refreshes

## Backend Components

### Database
- **PostgreSQL**: Primary database for user storage
- **SQLAlchemy**: ORM for database operations
- **User Model**: Stores username, email, hashed password, and metadata

### Authentication
- **JWT Tokens**: Stateless authentication with HS256 algorithm
- **Password Hashing**: Bcrypt with 12 rounds for security
- **Protected Endpoints**: `/api/predictions/{symbol}` requires authentication

### API Endpoints
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user information
- `GET /api/auth/verify` - Verify token validity
- `POST /api/auth/logout` - Logout (client-side token removal)

## Frontend Components

### Authentication Context
- **AuthContext**: Global state management for authentication
- **Token Storage**: JWT tokens stored in localStorage
- **Auto-restore**: Session restoration on page load

### Pages
- **LoginPage**: User login form with error handling
- **RegisterPage**: User registration with password validation
- **ProtectedRoute**: Wrapper component for protected pages

### Navigation
- **NavBar**: Shows login/logout buttons and user info
- **Conditional Rendering**: Different UI based on authentication state

## Environment Variables

### Required for Railway Deployment
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secure-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Generating JWT Secret
```bash
openssl rand -hex 32
```

## Railway Setup

1. **Add PostgreSQL Database**
   - Go to Railway dashboard
   - Add PostgreSQL database service
   - Copy the DATABASE_URL

2. **Set Environment Variables**
   - Add the environment variables listed above
   - Generate a secure JWT_SECRET

3. **Deploy**
   - Database tables are created automatically on first startup
   - No additional setup required

## Security Features

- **Password Hashing**: Bcrypt with 12 rounds
- **JWT Expiration**: 24-hour token lifetime
- **HTTPS**: Required in production (Railway provides this)
- **Input Validation**: All auth endpoints validate input
- **SQL Injection Protection**: SQLAlchemy ORM prevents SQL injection
- **CORS Configuration**: Properly configured for frontend domain

## Testing the Authentication

1. **Register a new account**
   - Visit `/register`
   - Fill in username, email, and password
   - Account is created and auto-login occurs

2. **Login with existing account**
   - Visit `/login`
   - Use username/email and password
   - Redirected to `/predict` on success

3. **Access protected page**
   - Visit `/predict` without login
   - Redirected to `/login`
   - After login, redirected back to `/predict`

4. **Logout**
   - Click logout button in navbar
   - Token removed and redirected to home

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Token expired or invalid - user needs to login again
2. **Database Connection**: Check DATABASE_URL environment variable
3. **JWT Secret**: Ensure JWT_SECRET is set and secure
4. **CORS Issues**: Verify CORS_ORIGINS includes your frontend domain

### Development vs Production
- **Development**: Uses SQLite fallback if no DATABASE_URL
- **Production**: Requires PostgreSQL and proper environment variables
