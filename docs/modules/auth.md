# Auth Module

**Path**: `src/auth/`

## Files

| File | Purpose |
| --- | --- |
| `auth.module.ts` | Imports `UsersModule`, provides `AuthService`, `TokenService` |
| `auth.controller.ts` | Routes: register, login, refresh, logout |
| `auth.service.ts` | Business logic: registration, login, password hashing |
| `services/token.service.ts` | JWT generation, refresh token management |
| `dto/register.dto.ts` | Validates: email, phone, password (min 8) |
| `dto/login.dto.ts` | Validates: identifier (email or phone), password |
| `dto/auth-response.dto.ts` | Defines: `AuthResponseDto`, `AccessTokenResponseDto` |
| `types/auth.types.ts` | Interfaces: `AuthTokens`, `RegisterAuthResult` |

## Dependencies

- **UsersModule** — for `UsersService` (create user, find by email/phone/id)
- **JwtModule** — provided globally via `JwtAuthModule`
- **ConfigService** — for auth config (secrets, expiration)

## Service Methods

### AuthService

#### `register(dto: RegisterDto)`

1. Check email uniqueness → `ConflictException` if taken
2. Check phone uniqueness → `ConflictException` if taken
3. Hash password with bcrypt (salt rounds from `process.env.BCRYPT_SALT_ROUNDS`)
4. Create user via `UsersService.create()`
5. Generate tokens via `TokenService`
6. Store hashed refresh token
7. Set refresh token cookie
8. Return `{ user, accessToken }`

#### `login(dto: LoginDto, res: Response)`

1. Find user by email or phone (checks both)
2. If not found → `UnauthorizedException`
3. Compare password with bcrypt
4. If mismatch → `UnauthorizedException`
5. Generate tokens via `TokenService`
6. Store hashed refresh token
7. Set refresh token cookie
8. Return `{ accessToken }`

#### `refresh(req: Request, res: Response)`

1. Extract `refreshToken` from cookies
2. If missing → `UnauthorizedException`
3. Verify refresh JWT signature
4. Validate stored token (hash lookup, revocation check, expiry check)
5. Find user by `payload.sub`
6. Generate new access token only (refresh token is **not** rotated)
7. Return `{ accessToken }`

#### `logout(req: Request, res: Response)`

1. Extract `refreshToken` from cookies
2. If missing → return success (idempotent)
3. Hash the token, find in DB
4. Delete the token record
5. Clear the cookie
6. Return `{ message: "Logged out successfully" }`

### TokenService

#### `generateTokens(payload: { sub, email, role })`

Returns `{ accessToken, refreshToken }` using separate secrets and expiration for each.

#### `storeRefreshToken(userId, rawToken)`

1. SHA-256 hash the raw token
2. Parse expiration from token claims
3. Create `RefreshToken` record in DB

#### `validateStoredRefreshToken(rawToken)`

1. Hash the token
2. Find by `tokenHash` in DB
3. Check `isRevoked !== true`
4. Check `expiresAt > now`
5. Return the token record or throw `UnauthorizedException`

#### `revokeRefreshToken(rawToken)`

Deletes the token record by hash.

## Cookie Configuration

```typescript
res.cookie('refreshToken', rawToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/auth',
});
```

## Authentication Flow Diagram

See [authentication.md](../authentication.md) for the complete sequence diagram.
