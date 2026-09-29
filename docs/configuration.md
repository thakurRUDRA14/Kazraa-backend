# Configuration

All configuration is loaded via `@nestjs/config` with `registerAs()` namespaced factories. Configuration is loaded globally (`isGlobal: true`) with caching enabled.

## Config Files

| File | Namespace | Source |
| --- | --- | --- |
| `src/config/app.config.ts` | `app` | `app.config.ts` |
| `src/config/auth.config.ts` | `auth` | `auth.config.ts` |
| `src/config/payment.config.ts` | `payment` | `payment.config.ts` |
| `src/config/cashfree.config.ts` | `cashfree` | `cashfree.config.ts` |
| `src/config/cloudinary.config.ts` | `cloudinary` | `cloudinary.config.ts` |
| `src/config/media.config.ts` | `media` | `media.config.ts` |

## Environment Variables

| Variable | Config Key | Type | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | `app.environment` | string | `development` | ❌ | Environment mode |
| `PORT` | `app.port` | number | `3000` | ❌ | Server port |
| `API_PREFIX` | `app.apiPrefix` | string | `api` | ❌ | ⚠️ Registered but never applied |
| `DATABASE_URL` | Direct | string | — | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | `auth.accessTokenSecret` | string | — | ✅ | Secret for access token signing |
| `JWT_ACCESS_EXPIRES_IN` | `auth.accessTokenExpiresIn` | string | `15m` | ❌ | Access token lifetime |
| `JWT_REFRESH_SECRET` | `auth.refreshTokenSecret` | string | — | ✅ | Secret for refresh token signing |
| `JWT_REFRESH_EXPIRES_IN` | `auth.refreshTokenExpiresIn` | string | `7d` | ❌ | Refresh token lifetime |
| `BCRYPT_SALT_ROUNDS` | `auth.bcryptSaltRounds` | number | `12` | ❌ | Bcrypt cost factor |
| `CASHFREE_ENVIRONMENT` | `cashfree.environment` | string | — | ✅ | `SANDBOX` or `PRODUCTION` |
| `CASHFREE_APP_ID` | `cashfree.appId` | string | — | ✅ | Cashfree application ID |
| `CASHFREE_SECRET_KEY` | `cashfree.secretKey` | string | — | ✅ | Cashfree secret key |
| `PAYMENT_RETURN_URL` | `payment.returnURL` | string | — | ✅ | URL where customer is redirected after payment |
| `PAYMENT_WEBHOOK_URL` | `payment.webhookURL` | string | — | ✅ | URL for Cashfree webhook notifications |
| `CLOUDINARY_CLOUD_NAME` | `cloudinary.cloudName` | string | — | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | `cloudinary.apiKey` | string | — | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `cloudinary.apiSecret` | string | — | ✅ | Cloudinary API secret |
| `MEDIA_MAX_IMAGE_SIZE_MB` | `media.maxImageSizeMb` | number | `10` | ❌ | Max upload size for images |
| `MEDIA_MAX_VIDEO_SIZE_MB` | `media.maxVideoSizeMb` | number | `50` | ❌ | Max upload size for videos |

## How Config is Used

Config values are accessed in services via `ConfigService`:

```typescript
// Typed access with getOrThrow (fails fast if missing)
const appId = this.configService.getOrThrow<string>('cashfree.appId');

// Direct env access (also used in some places)
const dbUrl = process.env.DATABASE_URL;
```

## Config Loading in AppModule

```typescript
ConfigModule.forRoot({
  isGlobal: true,    // Available in all modules without importing
  cache: true,       // Cache config values for performance
  load: [
    appConfig,
    authConfig,
    paymentConfig,
    cashfreeConfig,
    mediaConfig,
    cloudinaryConfig,
  ],
})
```

## Prisma Configuration

`prisma.config.ts` (project root) configures the Prisma CLI:

```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

## Notes

- `DATABASE_URL` is read directly from `process.env` by `PostgresService`, not through `ConfigService`.
- `BCRYPT_SALT_ROUNDS` is read directly from `process.env` in `AuthService.register()` instead of from the config system. See [known-issues.md](./known-issues.md#inconsistent-config-access).
- `API_PREFIX` is registered in `app.config.ts` but is never applied with `app.setGlobalPrefix()`. See [known-issues.md](./known-issues.md#unused-api-prefix).
