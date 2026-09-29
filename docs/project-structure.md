# Project Structure

```
Kazraa-Backend/
├── prisma/
│   ├── schema.prisma              # Complete database schema (24 models, 16 enums)
│   └── migrations/                # Prisma migration history
│
├── prisma.config.ts               # Prisma CLI configuration (schema path, migrations, datasource URL)
│
├── generated/
│   └── prisma/                    # Auto-generated Prisma Client (output of `prisma generate`)
│
├── src/
│   ├── main.ts                    # Application entry point — creates NestJS app, global pipes, cookie parser
│   ├── app.module.ts              # Root module — imports all feature modules and config
│   ├── app.controller.ts          # Root controller — GET / returns "Hello World!"
│   ├── app.service.ts             # Root service — getHello()
│   │
│   ├── config/                    # Namespaced configuration factories
│   │   ├── index.ts               # Barrel export for all config files
│   │   ├── app.config.ts          # app.* — NODE_ENV, PORT, API_PREFIX
│   │   ├── auth.config.ts         # auth.* — JWT secrets, expiration, bcrypt rounds
│   │   ├── payment.config.ts      # payment.* — return URL, webhook URL
│   │   ├── cashfree.config.ts     # cashfree.* — environment, app ID, secret key
│   │   ├── cloudinary.config.ts   # cloudinary.* — cloud name, API key, API secret
│   │   └── media.config.ts        # media.* — max image/video size in MB
│   │
│   ├── database/
│   │   └── postgres/
│   │       ├── postgres.module.ts  # @Global module exporting PostgresService
│   │       └── postgres.service.ts # Extends PrismaClient with PrismaPg adapter
│   │
│   ├── common/
│   │   ├── jwt/
│   │   │   ├── jwt-auth.module.ts  # @Global JWT module — registers JwtModule with access token config
│   │   │   ├── jwt-auth.guard.ts   # CanActivate guard — extracts Bearer token, verifies JWT, sets req.user
│   │   │   ├── roles.guard.ts      # CanActivate guard — checks @Roles() metadata against user.role
│   │   │   └── roles.decorator.ts  # @Roles(...roles) decorator using SetMetadata
│   │   │
│   │   ├── types/
│   │   │   └── authenticated-request.ts  # Request & { user: JwtPayload } type
│   │   │
│   │   └── utils/
│   │       └── slug.util.ts        # generateSlug() using slugify library
│   │
│   ├── auth/
│   │   ├── auth.module.ts          # Imports UsersModule, provides TokenService + AuthService
│   │   ├── auth.controller.ts      # POST /auth/register, /auth/login, /auth/refresh, /auth/logout
│   │   ├── auth.service.ts         # Registration, login, refresh, logout business logic
│   │   ├── services/
│   │   │   └── token.service.ts    # JWT generation, refresh token hashing/storage/validation/revocation
│   │   ├── dto/
│   │   │   ├── register.dto.ts     # email, phone, password validation
│   │   │   ├── login.dto.ts        # identifier (email or phone), password
│   │   │   └── auth-response.dto.ts # AuthResponseDto, AccessTokenResponseDto
│   │   └── types/
│   │       └── auth.types.ts       # AuthTokens, RegisterAuthResult interfaces
│   │
│   ├── users/
│   │   ├── users.module.ts         # Provides UsersService, AddressesService, exports both
│   │   ├── users.controller.ts     # GET/PATCH/DELETE /users/me, PATCH /users/me/password
│   │   ├── users.service.ts        # Profile CRUD, password change, soft delete
│   │   ├── dto/
│   │   │   ├── update-user.dto.ts  # firstName, lastName, phone (all optional)
│   │   │   ├── change-password.dto.ts # currentPassword, newPassword
│   │   │   └── create-user.dto.ts  # Empty file (unused)
│   │   └── addresses/
│   │       ├── addresses.controller.ts # GET/POST/PATCH/DELETE /users/me/addresses
│   │       ├── addresses.service.ts    # Address CRUD with default-address management, transactions
│   │       └── dto/
│   │           ├── create-address.dto.ts
│   │           └── update-address.dto.ts
│   │
│   ├── catalog/
│   │   ├── catalog.module.ts       # Imports MediaModule, registers all catalog sub-services
│   │   │
│   │   ├── categories/
│   │   │   ├── categories.controller.ts  # CRUD for /catalog/categories
│   │   │   ├── categories.service.ts     # Category CRUD with slug, hierarchy, media attachment
│   │   │   └── dto/
│   │   │       ├── create-category.dto.ts
│   │   │       └── update-category.dto.ts
│   │   │
│   │   ├── products/
│   │   │   ├── products.controller.ts    # CRUD for /catalog/products + sizes, attributes, media
│   │   │   ├── products.service.ts       # Product lifecycle — create, update, remove, media sync, sizes, attributes
│   │   │   └── dto/
│   │   │       ├── create-product.dto.ts
│   │   │       ├── update-product.dto.ts
│   │   │       ├── product-media.dto.ts
│   │   │       ├── update-product-media.dto.ts
│   │   │       ├── create-product-size.dto.ts
│   │   │       ├── update-product-size.dto.ts
│   │   │       ├── create-product-attribute.dto.ts
│   │   │       └── update-product-attribute.dto.ts
│   │   │
│   │   ├── sizes/
│   │   │   ├── sizes.controller.ts       # CRUD for /catalog/sizes
│   │   │   ├── sizes.service.ts          # Size CRUD within a SizeType
│   │   │   └── dto/
│   │   │
│   │   ├── size-types/
│   │   │   ├── size-types.controller.ts  # CRUD for /catalog/size-types
│   │   │   ├── size-types.service.ts     # SizeType CRUD
│   │   │   └── dto/
│   │   │
│   │   ├── attributes/
│   │   │   ├── attributes.controller.ts  # CRUD for /catalog/attributes + nested options
│   │   │   ├── attributes.service.ts     # Attribute + AttributeOption management
│   │   │   └── dto/
│   │   │
│   │   └── collections/
│   │       ├── collections.controller.ts # ⚠️ STUB — empty controller, no endpoints
│   │       └── collections.service.ts    # ⚠️ STUB — empty service
│   │
│   ├── cart/
│   │   ├── cart.module.ts          # Imports MediaModule
│   │   ├── cart.controller.ts      # GET /cart, POST/PATCH/DELETE /cart/items, DELETE /cart
│   │   ├── cart.service.ts         # Cart operations with stock validation and media resolution
│   │   └── dto/
│   │       ├── add-cart-item.dto.ts    # productSizeId, quantity
│   │       └── update-cart-item.dto.ts # quantity
│   │
│   ├── orders/
│   │   ├── orders.module.ts        # Standalone module
│   │   ├── orders.controller.ts    # Customer + admin order endpoints
│   │   ├── orders.service.ts       # Order creation, cancellation, returns, RTO, status transitions
│   │   └── dto/
│   │       ├── create-order.dto.ts        # addressId, paymentMethod, notes
│   │       ├── update-order-status.dto.ts # status (OrderStatus enum)
│   │       ├── create-return-request.dto.ts # reason
│   │       ├── create-rto.dto.ts          # reason
│   │       └── return-order.dto.ts        # (exists but unused by controller)
│   │
│   ├── payments/
│   │   ├── payments.module.ts      # Registers factory, CashfreeClient, CashfreeProvider
│   │   ├── payments.controller.ts  # POST /payments, /payments/verify, /payments/:orderId/refund, /payments/webhook/cashfree
│   │   ├── payments.service.ts     # Payment orchestration — delegates to providers
│   │   ├── types/
│   │   │   └── payment.types.ts    # Request/response interfaces for provider abstraction
│   │   ├── dto/
│   │   │   ├── create-payment.dto.ts  # orderId, method
│   │   │   ├── verify-payment.dto.ts  # orderId
│   │   │   └── refund-payment.dto.ts  # amount, note
│   │   └── providers/
│   │       ├── payment-provider.interface.ts  # PaymentProvider interface
│   │       ├── payment-provider.factory.ts    # Factory selecting provider by enum
│   │       └── cashfree/
│   │           ├── cashfree.client.ts    # Wrapper around Cashfree SDK methods
│   │           ├── cashfree.provider.ts  # Implements PaymentProvider interface
│   │           ├── cashfree.mapper.ts    # Maps Cashfree responses → internal types
│   │           └── cashfree.types.ts     # Cashfree-specific request/response types
│   │
│   └── media/
│       ├── media.module.ts         # Provides MediaService, injects CloudinaryStorage via MEDIA_STORAGE token
│       ├── media.controller.ts     # POST /media/upload, GET /media, GET /media/:id, DELETE /media/:id
│       ├── media.service.ts        # Upload, attach, detach, delete — polymorphic media system
│       ├── constants/
│       │   └── media.tokens.ts     # MEDIA_STORAGE injection token symbol
│       ├── interfaces/
│       │   ├── media-storage-provider.interface.ts # MediaStorageProvider interface
│       │   ├── media-file.interface.ts             # MediaFile type (buffer, originalname, mimetype, size)
│       │   ├── media-upload.interface.ts           # UploadMediaInput
│       │   └── media-attach.interface.ts           # AttachMediaInput
│       ├── dto/
│       │   └── upload-media.dto.ts  # purpose (MediaPurpose enum)
│       └── providers/
│           └── cloudinary.storage.ts # CloudinaryStorage implements MediaStorageProvider
│
├── .env.example                   # Template environment variables
├── .env                           # Actual environment (gitignored)
├── package.json                   # Dependencies, scripts
├── pnpm-lock.yaml                 # Lock file
├── pnpm-workspace.yaml            # Workspace config
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.build.json            # Build-specific TS config
├── nest-cli.json                  # NestJS CLI config
├── eslint.config.mjs              # ESLint flat config
├── .prettierrc                    # Prettier configuration
└── .gitignore                     # Git ignore rules
```

## Notes

- `⚠️ STUB` marks files that exist in the codebase but contain no implementation (empty class body).
- `generated/prisma/` is auto-generated and should not be manually edited.
- `dist/` contains compiled JavaScript output.
- Test files (`*.spec.ts`) exist as scaffolds but contain no meaningful test logic.
- `bug.md` in the root is a development notes file, not part of the application.
