# Architecture

## Overview

Kazraa Backend is a **modular monolith** built with NestJS. Each business domain is encapsulated in its own NestJS module with its own controllers, services, and DTOs. There is no microservice or event-driven communication — all modules share a single PostgreSQL database and a single process.

## Architectural Style

```
Request
  ↓
NestJS HTTP Layer (Express)
  ↓
Global Pipes (ValidationPipe)
  ↓
Cookie Parser Middleware
  ↓
Guards (JwtAuthGuard → RolesGuard)
  ↓
Controller
  ↓
Service (Business Logic)
  ↓
PostgresService (Prisma Client)
  ↓
PostgreSQL
```

### Key Patterns

| Pattern | Implementation |
| --- | --- |
| **Dependency Injection** | NestJS DI container. All services are `@Injectable()`. |
| **Factory Pattern** | `PaymentProviderFactory` selects the correct payment provider at runtime. |
| **Strategy Pattern** | `MediaStorageProvider` interface with `CloudinaryStorage` implementation. |
| **Repository Pattern** | Not explicit — services query Prisma directly. `PostgresService` extends `PrismaClient`. |
| **DTO Validation** | `class-validator` decorators on DTO classes, enforced by `ValidationPipe`. |
| **Soft Delete** | Most entities use `deletedAt` + `isDeleted`/`isActive` flags instead of hard deletes. |
| **Transactional Operations** | Complex mutations use `prisma.$transaction()` with interactive transactions. |

## Module Boundaries

```mermaid
graph LR
    AppModule --> JwtAuthModule
    AppModule --> PostgresModule
    AppModule --> AuthModule
    AppModule --> UsersModule
    AppModule --> CatalogModule
    AppModule --> CartModule
    AppModule --> OrdersModule
    AppModule --> PaymentsModule
    AppModule --> MediaModule

    AuthModule -->|imports| UsersModule
    CatalogModule -->|imports| MediaModule
    CartModule -->|imports| MediaModule

    JwtAuthModule -.->|@Global| AllModules[All Modules]
    PostgresModule -.->|@Global| AllModules
```

### Global Modules

Two modules are decorated with `@Global()`, making their exports available to every module without explicit imports:

1. **`PostgresModule`** — exports `PostgresService` (Prisma Client)
2. **`JwtAuthModule`** — exports `JwtAuthGuard`, `RolesGuard`, `JwtModule`

### Dependency Flow

| Module | Depends On |
| --- | --- |
| `AuthModule` | `UsersModule` (for user lookup/creation) |
| `CatalogModule` | `MediaModule` (for attaching images to products/categories) |
| `CartModule` | `MediaModule` (for resolving product images in cart response) |
| `OrdersModule` | None (queries media directly via Prisma) |
| `PaymentsModule` | `ConfigModule` (for Cashfree credentials) |
| `MediaModule` | None (standalone; injected `MEDIA_STORAGE` token) |

## Request Lifecycle

1. **Incoming HTTP request** hits Express (via `@nestjs/platform-express`)
2. **`cookieParser()` middleware** parses cookies (used for refresh tokens)
3. **`ValidationPipe`** (global) validates and transforms request body using DTO decorators:
   - `whitelist: true` — strips unknown properties
   - `forbidNonWhitelisted: true` — rejects requests with unknown properties
   - `transform: true` — auto-transforms payload types
4. **Guards** execute in order:
   - `JwtAuthGuard` — extracts and verifies the `Authorization: Bearer` token, attaches `user` to request
   - `RolesGuard` — checks `@Roles()` decorator metadata against `user.role`
5. **Controller** method executes, delegating to a **Service**
6. **Service** performs business logic, calls `PostgresService` (Prisma) for database operations
7. **Response** is serialized to JSON and returned

## Database Layer

- `PostgresService` extends `PrismaClient` directly (no lifecycle hooks like `onModuleInit`)
- Uses `@prisma/adapter-pg` (`PrismaPg`) for the connection, reading `DATABASE_URL` from env
- Interactive transactions (`$transaction(async (tx) => { ... })`) are used for multi-step mutations
- Advisory locks (`pg_advisory_xact_lock`) are used for order number generation to prevent race conditions

## External Integrations

External services are accessed through abstracted interfaces:

### Payment
```
PaymentsService → PaymentProviderFactory → PaymentProvider interface
                                             └─ CashfreeProvider → CashfreeClient → Cashfree SDK
```

### Media Storage
```
MediaService → @Inject(MEDIA_STORAGE) → MediaStorageProvider interface
                                          └─ CloudinaryStorage → Cloudinary SDK
```

Both use NestJS DI for provider resolution. Adding a new provider means:
1. Implementing the interface
2. Registering in the factory/module

## Configuration System

Uses `@nestjs/config` with `registerAs()` namespaced configuration factories:

| Namespace | Config File |
| --- | --- |
| `app` | `src/config/app.config.ts` |
| `auth` | `src/config/auth.config.ts` |
| `payment` | `src/config/payment.config.ts` |
| `cashfree` | `src/config/cashfree.config.ts` |
| `cloudinary` | `src/config/cloudinary.config.ts` |
| `media` | `src/config/media.config.ts` |

Config is loaded globally (`isGlobal: true`) with caching enabled.

## Error Handling

The application relies on NestJS's built-in exception handling:

- `BadRequestException` (400) — validation failures, business rule violations
- `UnauthorizedException` (401) — invalid credentials, expired tokens
- `ForbiddenException` (403) — insufficient roles
- `NotFoundException` (404) — entity not found
- `ConflictException` (409) — duplicate records

There are **no custom exception filters**. The default NestJS exception filter converts thrown `HttpException` subclasses into JSON responses.

## Separation of Concerns

| Layer | Responsibility |
| --- | --- |
| **Controller** | HTTP routing, request parsing, guard application, delegating to service |
| **Service** | Business logic, validation, database queries, external service calls |
| **DTO** | Request validation schema |
| **Types/Interfaces** | Internal type contracts |
| **Providers** | External service wrappers (Cashfree, Cloudinary) |
| **Guards** | Authentication and authorization |
| **Config** | Environment variable mapping |
