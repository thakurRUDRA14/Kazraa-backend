# Application Flow

## Application Startup

The application boots via `src/main.ts`:

```
1. NestFactory.create(AppModule, { rawBody: true })
   └── rawBody: true enables access to the raw request body (used by Cashfree webhook)

2. app.useGlobalPipes(new ValidationPipe({
     whitelist: true,           // Strip unknown properties
     transform: true,           // Auto-transform types
     forbidNonWhitelisted: true // Reject unknown properties with 400
   }))

3. app.use(cookieParser())
   └── Parses cookies from incoming requests (used for refresh tokens)

4. BigInt.prototype.toJSON = function() { return this.toString() }
   └── Global override so BigInt values (e.g., Media.size) serialize to JSON strings

5. app.listen(process.env.PORT ?? 3000, '0.0.0.0')
   └── Listens on all interfaces
```

## Module Loading Order

`AppModule` imports:

```
1. ConfigModule.forRoot({
     isGlobal: true,
     cache: true,
     load: [appConfig, authConfig, paymentConfig, cashfreeConfig, mediaConfig, cloudinaryConfig]
   })
2. JwtAuthModule          (Global — JWT config, guards)
3. PostgresModule         (Global — Prisma Client)
4. UsersModule
5. AuthModule             (depends on UsersModule)
6. CatalogModule          (depends on MediaModule)
7. CartModule             (depends on MediaModule)
8. OrdersModule
9. PaymentsModule
10. MediaModule
```

## Request Flow — Unauthenticated

```
Client
  ↓
Express HTTP Server
  ↓
Cookie Parser Middleware
  ↓
ValidationPipe (if body exists)
  ↓
Controller Method
  ↓
Service
  ↓
Prisma → PostgreSQL
  ↓
JSON Response
```

Example: `GET /catalog/products` — no guard applied.

## Request Flow — Authenticated

```
Client
  ↓  Authorization: Bearer <access_token>
Express HTTP Server
  ↓
Cookie Parser Middleware
  ↓
ValidationPipe (if body exists)
  ↓
JwtAuthGuard.canActivate()
  ├── extractToken() → reads "Bearer" from Authorization header
  ├── jwtService.verifyAsync() → validates token signature + expiration
  ├── Sets request.user = { sub, email, role }
  └── Returns true (or throws 401)
  ↓
Controller Method
  ↓
Service (has access to userId via req.user.sub)
  ↓
Response
```

## Request Flow — Role-Protected

```
Client
  ↓  Authorization: Bearer <access_token>
Express HTTP Server
  ↓
JwtAuthGuard.canActivate()        ← Authenticates
  ↓
RolesGuard.canActivate()          ← Authorizes
  ├── Reads @Roles() metadata from handler/class
  ├── Compares req.user.role against required roles
  └── Returns true or throws 403 ForbiddenException
  ↓
Controller Method
  ↓
Service
  ↓
Response
```

Example: `POST /catalog/products` — requires `@Roles(UserRole.ADMIN)`.

## Data Flow — Order Creation (Complex Transaction)

```
Client
  ↓  POST /orders { addressId, paymentMethod, notes }
JwtAuthGuard → Authenticate
  ↓
OrdersController.createOrder(req.user.sub, dto)
  ↓
OrdersService.createOrder(userId, dto)
  ↓  prisma.$transaction(async (tx) => { ... })
  │
  ├── 1. Find user's ACTIVE cart (with items → productSize → product → category, size)
  ├── 2. Validate cart exists and is not empty
  ├── 3. Find and validate shipping address
  ├── 4. Fetch primary media for all products in cart
  ├── 5. For each cart item:
  │     ├── Validate product is ACTIVE and not deleted
  │     ├── Validate productSize is active and not deleted
  │     ├── Validate sufficient stock
  │     ├── Calculate item total (sellingPrice × quantity)
  │     └── Build product snapshot (name, slug, sku, size, mediaId)
  ├── 6. Calculate shipping (free if subtotal ≥ 999, else ₹99)
  ├── 7. Generate unique order number (with pg_advisory_xact_lock)
  ├── 8. Create Order + OrderAddress + OrderItems + Payment in single create
  ├── 9. Decrement stock for each item (with optimistic check)
  └── 10. Convert cart status to CONVERTED
  ↓
JSON Response (order with items, address, payment)
```
