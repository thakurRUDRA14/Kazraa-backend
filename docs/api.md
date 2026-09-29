# API Reference

All endpoints return JSON. Request bodies are validated using `class-validator` decorators. Unknown properties in the body are rejected (HTTP 400).

## Auth

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | ❌ | Register a new user |
| POST | `/auth/login` | ❌ | Login with email/phone + password |
| POST | `/auth/refresh` | Cookie | Get a new access token |
| POST | `/auth/logout` | Cookie | Revoke refresh token |

### POST /auth/register

```json
// Request Body
{
  "email": "user@example.com",    // required, valid email
  "phone": "9876543210",          // required
  "password": "min8chars"         // required, min 8 characters
}

// Response 201
{
  "user": { "id", "email", "phone", "role", ... },
  "accessToken": "eyJhbG..."
}
// Set-Cookie: refreshToken=...; HttpOnly; Path=/auth
```

### POST /auth/login

```json
// Request Body
{
  "identifier": "user@example.com",  // required — email or phone
  "password": "password123"          // required
}

// Response 200
{
  "accessToken": "eyJhbG..."
}
// Set-Cookie: refreshToken=...; HttpOnly; Path=/auth
```

### POST /auth/refresh

No body required. Reads `refreshToken` from cookies.

```json
// Response 200
{
  "accessToken": "eyJhbG..."
}
```

### POST /auth/logout

No body required. Reads `refreshToken` from cookies.

```json
// Response 200
{ "message": "Logged out successfully" }
// Clears refreshToken cookie
```

---

## Users

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| GET | `/users/me` | ✅ | Any | Get current user profile |
| PATCH | `/users/me` | ✅ | Any | Update profile |
| DELETE | `/users/me` | ✅ | Any | Soft-delete account |
| PATCH | `/users/me/password` | ✅ | Any | Change password |

### PATCH /users/me

```json
// Request Body (all optional)
{
  "firstName": "John",        // max 50 chars
  "lastName": "Doe",          // max 50 chars
  "phone": "9876543210"       // max 15 chars
}
```

### PATCH /users/me/password

```json
// Request Body
{
  "currentPassword": "oldpassword",   // required
  "newPassword": "newpassword123"     // required, min 8 chars
}
```

---

## Addresses

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| GET | `/users/me/addresses` | ✅ | Any | List all addresses |
| GET | `/users/me/addresses/:id` | ✅ | Any | Get single address |
| POST | `/users/me/addresses` | ✅ | Any | Create address |
| PATCH | `/users/me/addresses/:id` | ✅ | Any | Update address |
| DELETE | `/users/me/addresses/:id` | ✅ | Any | Soft-delete address |

### POST /users/me/addresses

```json
// Request Body
{
  "firstName": "John",             // required
  "lastName": "Doe",               // required
  "phone": "9876543210",           // required
  "addressLine1": "123 Main St",   // required
  "addressLine2": "Apt 4",         // optional
  "city": "Mumbai",                // required
  "state": "Maharashtra",          // required
  "postalCode": "400001",          // required
  "country": "India",              // optional, default: "India"
  "isDefault": true                // optional, default: false
}
```

---

## Catalog — Categories

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| GET | `/catalog/categories` | ❌ | — | List all categories |
| GET | `/catalog/categories/:id` | ❌ | — | Get category with children |
| POST | `/catalog/categories` | ✅ | ADMIN | Create category |
| PATCH | `/catalog/categories/:id` | ✅ | ADMIN | Update category |
| DELETE | `/catalog/categories/:id` | ✅ | ADMIN | Soft-delete category |

### POST /catalog/categories

```json
{
  "name": "Women's Tops",         // required
  "description": "...",            // optional
  "parentId": "<uuid>",           // optional
  "isActive": true,               // optional, default: true
  "mediaId": "<uuid>"             // optional — attach primary image
}
```

---

## Catalog — Products

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| GET | `/catalog/products` | ❌ | — | List all products |
| GET | `/catalog/products/:id` | ❌ | — | Get product detail |
| POST | `/catalog/products` | ✅ | ADMIN | Create product |
| PATCH | `/catalog/products/:id` | ✅ | ADMIN | Update product |
| DELETE | `/catalog/products/:id` | ✅ | ADMIN | Soft-delete product |
| PUT | `/catalog/products/:productId/media` | ✅ | ADMIN | Replace all product media |
| POST | `/catalog/products/:productId/sizes` | ✅ | ADMIN | Add product-size variant |
| PATCH | `/catalog/products/:productId/sizes/:productSizeId` | ✅ | ADMIN | Update variant |
| DELETE | `/catalog/products/:productId/sizes/:productSizeId` | ✅ | ADMIN | Remove variant |
| POST | `/catalog/products/:productId/attributes` | ✅ | ADMIN | Assign attribute |
| PATCH | `/catalog/products/:productId/attributes/:attributeId` | ✅ | ADMIN | Update assignment |
| DELETE | `/catalog/products/:productId/attributes/:attributeId` | ✅ | ADMIN | Remove assignment |

### POST /catalog/products

```json
{
  "categoryId": "<uuid>",              // required
  "name": "Cotton T-Shirt",            // required
  "shortDescription": "...",           // optional
  "description": "...",                // optional
  "seoTitle": "...",                   // optional
  "seoDescription": "...",            // optional
  "seoKeywords": ["cotton", "tshirt"], // optional
  "status": "DRAFT",                   // optional, default: DRAFT
  "media": [                           // optional
    { "mediaId": "<uuid>", "role": "PRIMARY", "sortOrder": 0 }
  ],
  "sizes": [                           // optional
    {
      "sizeId": "<uuid>",
      "sku": "CT-S-001",
      "barcode": "...",                // optional
      "mrp": 999,
      "sellingPrice": 799,
      "availableStock": 100,
      "weight": 0.2,                   // optional
      "isActive": true                 // optional
    }
  ],
  "attributes": [                      // optional
    {
      "attributeId": "<uuid>",
      "optionIds": ["<uuid>"],         // for SELECT/MULTI_SELECT/COLOR
      "value": "..."                   // for TEXT/NUMBER/etc.
    }
  ]
}
```

---

## Catalog — Size Types

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| GET | `/catalog/size-types` | ❌ | — | List all |
| GET | `/catalog/size-types/:id` | ❌ | — | Get one |
| POST | `/catalog/size-types` | ✅ | ADMIN | Create |
| PATCH | `/catalog/size-types/:id` | ✅ | ADMIN | Update |
| DELETE | `/catalog/size-types/:id` | ✅ | ADMIN | Soft-delete |

## Catalog — Sizes

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| GET | `/catalog/sizes` | ❌ | — | List all |
| GET | `/catalog/sizes/:id` | ❌ | — | Get one |
| POST | `/catalog/sizes` | ✅ | ADMIN | Create |
| PATCH | `/catalog/sizes/:id` | ✅ | ADMIN | Update |
| DELETE | `/catalog/sizes/:id` | ✅ | ADMIN | Soft-delete |

## Catalog — Attributes

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| GET | `/catalog/attributes` | ❌ | — | List all |
| GET | `/catalog/attributes/:id` | ❌ | — | Get one with options |
| POST | `/catalog/attributes` | ✅ | ADMIN | Create |
| PATCH | `/catalog/attributes/:id` | ✅ | ADMIN | Update |
| DELETE | `/catalog/attributes/:id` | ✅ | ADMIN | Soft-delete |
| POST | `/catalog/attributes/:attributeId/options` | ✅ | ADMIN | Add option |
| PATCH | `/catalog/attributes/:attributeId/options/:optionId` | ✅ | ADMIN | Update option |
| DELETE | `/catalog/attributes/:attributeId/options/:optionId` | ✅ | ADMIN | Delete option |

---

## Cart

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/cart` | ✅ | Get or create active cart |
| POST | `/cart/items` | ✅ | Add item to cart |
| PATCH | `/cart/items/:id` | ✅ | Update item quantity |
| DELETE | `/cart/items/:id` | ✅ | Remove item from cart |
| DELETE | `/cart` | ✅ | Clear all cart items |

### POST /cart/items

```json
{
  "productSizeId": "<uuid>",  // required
  "quantity": 2               // required, min: 1
}
```

### PATCH /cart/items/:id

```json
{
  "quantity": 3  // required, min: 1
}
```

---

## Orders

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| POST | `/orders` | ✅ | Any | Create order from cart |
| GET | `/orders/me` | ✅ | Any | List customer's orders |
| GET | `/orders/me/:id` | ✅ | Any | Get single order |
| PATCH | `/orders/:id/cancel` | ✅ | Any | Cancel order |
| POST | `/orders/:id/return` | ✅ | Any | Request return |
| GET | `/orders` | ✅ | ADMIN | List all orders |
| GET | `/orders/:id` | ✅ | ADMIN | Get any order |
| PATCH | `/orders/:id/status` | ✅ | ADMIN | Update order status |
| POST | `/orders/:id/rto` | ✅ | ADMIN | Mark as Return-to-Origin |

### POST /orders

```json
{
  "addressId": "<uuid>",          // required
  "paymentMethod": "ONLINE",      // required: COD, ONLINE, UPI, CARD, NET_BANKING, WALLET
  "notes": "Please gift wrap"     // optional
}
```

### PATCH /orders/:id/status

```json
{
  "status": "CONFIRMED"  // OrderStatus enum
}
```

### POST /orders/:id/return

```json
{
  "reason": "Wrong size received"  // required, max 500 chars
}
```

### POST /orders/:id/rto

```json
{
  "reason": "Customer unreachable"  // required, max 500 chars
}
```

---

## Payments

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/payments` | ✅ | Initialize payment for order |
| POST | `/payments/verify` | ✅ | Verify payment status |
| POST | `/payments/:orderId/refund` | ✅ | Initiate refund |
| POST | `/payments/webhook/cashfree` | ❌ | Cashfree webhook receiver |

### POST /payments

```json
{
  "orderId": "<uuid>",      // required
  "method": "ONLINE"        // required (PaymentMethod enum)
}
```

### POST /payments/verify

```json
{
  "orderId": "<uuid>"  // required
}
```

### POST /payments/:orderId/refund

```json
{
  "amount": 499.00,                  // required, min: 0.01
  "note": "Customer return refund"   // optional
}
```

---

## Media

| Method | Endpoint | Auth | Role | Description |
| --- | --- | --- | --- | --- |
| POST | `/media/upload` | ✅ | ADMIN | Upload file (multipart/form-data) |
| GET | `/media` | ✅ | ADMIN | List all media |
| GET | `/media/:id` | ✅ | ADMIN | Get media details |
| DELETE | `/media/:id` | ✅ | ADMIN | Delete media |

### POST /media/upload

**Content-Type**: `multipart/form-data`

| Field | Type | Description |
| --- | --- | --- |
| file | File | Required. image/jpeg, image/png, image/webp, video/mp4, video/webm, video/quicktime |
| purpose | String | Required. Enum: PRODUCT, CATEGORY, BANNER, PROFILE, OTHER |

---

## Error Response Format

All error responses follow the NestJS standard format:

```json
{
  "statusCode": 400,
  "message": "Validation error details" | ["array", "of", "errors"],
  "error": "Bad Request"
}
```
