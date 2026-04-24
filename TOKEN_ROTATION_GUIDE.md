# Token Rotation & Refresh Token Implementation Guide

## Overview

This document outlines the comprehensive refresh token and token rotation system implemented in the AI Learning Assistant application. The system provides:

- **Token Rotation**: Automatic generation of new token pairs on refresh
- **Token Versioning**: Prevents token reuse attacks
- **Security Tracking**: Login history and token lifecycle monitoring
- **Automatic Refresh**: Middleware for seamless token refresh
- **Logout Protection**: Proper token invalidation on logout

---

## Architecture

### Token Lifecycle

```
User Login
    ↓
Generate Token Pair (v1)
├── Access Token (15 min, short-lived)
└── Refresh Token (7 days, long-lived)
    ↓
Token Stored in DB + Cookies
    ↓
Client Makes Request with Access Token
    ↓
Access Token Validation
    ├── Valid → Continue
    └── Expiring Soon (< 5 min) → Trigger Rotation
        ↓
        Use Refresh Token to Get New Pair (v2)
        ↓
        Old Tokens Invalidated
        ↓
        New Tokens Set in Cookies
    ↓
Request Completes
    ↓
User Logout
    ├── Invalidate All Tokens
    ├── Increment Version
    └── Clear Cookies
```

---

## Updated Components

### 1. JWT_Generator.js
**Location**: `Backend/Utils/JWT_Generator.js`

**New Features**:
- Token versioning support
- Better error messages
- Token expiration checking utilities
- Token expiring-soon detection (5 min threshold)

**Key Functions**:
```javascript
// Generate tokens with version
generateAccessToken(user, tokenVersion)       // 15 min expiry
generateRefreshToken(user, tokenVersion)      // 7 day expiry

// Verification
verifyToken(token, type)                      // Type: 'access' or 'refresh'
isTokenExpiringSoon(token)                    // Returns true if < 5 min left
isTokenExpired(token)                         // Returns true if expired
getTokenExpiration(token)                     // Returns Unix timestamp
```

### 2. User.Model.js
**Location**: `Backend/Model/User.Model.js`

**New Fields**:
```javascript
tokenVersion {
  type: Number,
  default: 1,
  description: "Incremented on logout/forced refresh to invalidate old tokens"
}

lastTokenRotation {
  type: Date,
  default: null,
  description: "When tokens were last rotated"
}

lastRefresh {
  type: Date,
  default: null,
  description: "When tokens were last refreshed"
}

isLoggedOut {
  type: Boolean,
  default: false,
  description: "Flag to prevent token reuse after logout"
}

loginHistory [{
  timestamp: Date,
  ipAddress: String,
  userAgent: String
}]
```

### 3. authController.js
**Location**: `Backend/Controller/authController.js`

**Enhanced Controllers**:

#### loginController
- Generates initial token pair with version 1
- Tracks login history (IP, user-agent)
- Supports "remember me" functionality
- Sets secure HTTP-only cookies

#### refreshTokenController
- **Token Rotation**: Issues new token pair with incremented version
- **Attack Detection**: Detects possible token reuse attacks
- **Validation**: Matches stored token with incoming token
- **Version Check**: Ensures token version matches
- **Response**: Returns new tokens + rotation flag

#### logoutController
- Invalidates all tokens
- Increments version to prevent reuse
- Sets `isLoggedOut` flag
- Clears cookies

### 4. Token Rotation Middleware
**Location**: `Backend/Middleware/tokenRotationMiddleware.js`

**Three Middleware Functions**:

#### tokenRotationMiddleware
- Monitors access token expiration
- Auto-refreshes if expiring soon (< 5 min)
- Updates cookies with new tokens
- Attaches token info to requests

```javascript
// Usage in server.js:
app.use(tokenRotationMiddleware);
```

#### checkTokenExpiryMiddleware
- Adds token expiry info to response headers
- Used for client-side monitoring

#### forceTokenRefreshMiddleware
- Enforces periodic token refresh
- Can force refresh after X seconds
- Useful for security-sensitive operations

---

## Refresh Token Utility Functions
**Location**: `Backend/Utils/tokenRefreshManager.js`

### Available Functions

#### refreshUserTokens(userId, currentTokenVersion)
Refreshes user tokens with rotation
```javascript
const result = await refreshUserTokens(userId, currentVersion);
// Returns: { accessToken, refreshToken, tokenVersion, expiresIn, user }
```

#### validateRefreshToken(refreshToken, userId)
Validates refresh token and checks for attacks
```javascript
await validateRefreshToken(token, userId);
// Throws error if invalid or attack detected
```

#### invalidateUserTokens(userId)
Invalidates all tokens (logout)
```javascript
await invalidateUserTokens(userId);
```

#### revokeAllSessions(userId)
Revokes all user sessions (account compromise case)
```javascript
await revokeAllSessions(userId);
```

#### getTokenMetadata(token, type)
Get token details and expiration info
```javascript
const metadata = getTokenMetadata(token, 'access');
// Returns: { userId, email, expiresIn, isExpired, isExpiringSoon, ... }
```

#### shouldRefreshToken(token)
Check if token needs refresh (< 5 min left)
```javascript
if (shouldRefreshToken(accessToken)) {
  // Refresh token
}
```

#### getUserLoginHistory(userId, limit)
Get user's login history
```javascript
const history = await getUserLoginHistory(userId, 10);
```

---

## Integration Guide

### 1. Update server.js
Add token rotation middleware:
```javascript
import tokenRotationMiddleware, { 
  checkTokenExpiryMiddleware 
} from "./Middleware/tokenRotationMiddleware.js";

// Apply to all requests
app.use(tokenRotationMiddleware);
app.use(checkTokenExpiryMiddleware);

// Or apply to specific routes:
app.use("/api/protected", tokenRotationMiddleware, protectedMiddleware);
```

### 2. Update Environment Variables
```env
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
NODE_ENV=production  # Set to production for secure cookies
```

**Note**: Ensure `JWT_REFRESH_SECRET` is different from `JWT_ACCESS_SECRET`

### 3. Frontend Integration

#### Storing Tokens
```javascript
// After login
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
```

#### Auto-Refresh Handler
```javascript
// In your API interceptor
if (error.status === 401 && error.data?.requiresRefresh) {
  const refreshToken = localStorage.getItem('refreshToken');
  
  // Call refresh endpoint
  const refreshResponse = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  if (refreshResponse.ok) {
    const data = await refreshResponse.json();
    // Update tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    // Retry original request
    return retryRequest();
  }
}
```

#### Monitor Token Expiration
```javascript
// Check if token expires soon
import { shouldRefreshToken } from '../utils/tokenRefreshManager.js';

if (shouldRefreshToken(accessToken)) {
  // Proactively refresh
  await refreshTokens();
}
```

---

## Security Features

### 1. Token Versioning
- Each token pair has a version number
- Version increments on refresh
- Old versions are invalidated
- **Protection**: Prevents old token reuse

### 2. Token Binding
- Refresh token stored in database
- Incoming token compared with stored token
- Mismatch triggers version increment
- **Protection**: Detects token replay attacks

### 3. Login History Tracking
- Tracks IP address of each login
- Records user-agent
- Last 10 logins stored
- **Protection**: Detects unusual login patterns

### 4. Logout Protection
- Sets `isLoggedOut` flag
- Increments version to invalidate tokens
- Clears stored tokens
- **Protection**: Prevents post-logout token use

### 5. Automatic Refresh
- Client doesn't get manually expired access token
- Middleware refreshes before expiration
- Seamless user experience
- **Protection**: Reduces token compromise window

---

## Key Security Considerations

### 1. Token Storage
- ✅ Access tokens in HTTP-only cookies (not localStorage)
- ✅ Refresh tokens in HTTP-only cookies
- ⚠️ Never store sensitive tokens in localStorage
- ⚠️ Never send tokens in URLs

### 2. Expiration Times
- ✅ Access Token: 15 minutes (short-lived)
- ✅ Refresh Token: 7 days (long-lived)
- ✅ Token rotation before expiration
- ⚠️ Adjust based on security requirements

### 3. Version Increment
- ✅ Increment on logout
- ✅ Increment on password change
- ✅ Increment on suspicious activity
- ✅ Large increment (+=10) on account compromise

### 4. Cookie Settings
```javascript
{
  httpOnly: true,        // Prevent JS access (XSS protection)
  secure: true,          // HTTPS only in production
  sameSite: 'strict',    // CSRF protection
  maxAge: milliseconds   // Expiration time
}
```

---

## Troubleshooting

### Issue: "Invalid refresh token"
**Cause**: Token mismatch detected (possible attack)
**Solution**: 
- User must login again
- Check browser security settings
- Verify token rotation middleware is active

### Issue: "Token has been rotated"
**Cause**: Using old token version
**Solution**: 
- Use latest tokens from refresh response
- Clear localStorage and re-login

### Issue: Token not auto-refreshing
**Cause**: Middleware not applied or tokens not in cookies
**Solution**:
- Verify middleware is added to server.js
- Check cookie settings in browser dev tools
- Ensure tokens are being set correctly

### Issue: CORS errors after token refresh
**Cause**: Credentials not sent with requests
**Solution**:
```javascript
// In axios/fetch:
axios.defaults.withCredentials = true;
// Or
fetch(url, { credentials: 'include' })
```

---

## Best Practices

1. **Always verify token version** before processing requests
2. **Implement token refresh before expiration** for seamless UX
3. **Monitor login history** for suspicious activity
4. **Revoke all sessions** when password changes
5. **Use different secrets** for access and refresh tokens
6. **Implement rate limiting** on refresh endpoint
7. **Log token-related errors** for security audit
8. **Rotate credentials** periodically in production
9. **Use HTTPS** in production (secure cookies)
10. **Test token expiration** scenarios thoroughly

---

## Response Format

### After Login
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "user@example.com",
    "name": "User Name"
  },
  "statusCode": 200
}
```

### After Token Refresh
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token",
  "tokenRotation": true,
  "statusCode": 200
}
```

### Logout Response
```json
{
  "success": true,
  "message": "Logout successful",
  "statusCode": 200
}
```

---

## Files Modified/Created

| File | Type | Purpose |
|------|------|---------|
| `Utils/JWT_Generator.js` | Modified | Enhanced token generation and validation |
| `Model/User.Model.js` | Modified | Added token tracking fields |
| `Controller/authController.js` | Modified | Implemented token rotation logic |
| `Middleware/tokenRotationMiddleware.js` | Created | Automatic token refresh middleware |
| `Utils/tokenRefreshManager.js` | Created | Token management utilities |

---

## Next Steps

1. ✅ Install dependencies (already included)
2. ✅ Update server.js with middleware
3. ✅ Configure environment variables
4. ✅ Update frontend token handling
5. ✅ Test token lifecycle in development
6. ✅ Deploy and monitor in production
7. ✅ Set up alerts for token-related errors

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the JWT files for implementation details
3. Check server logs for token-related errors
4. Verify middleware is properly configured

