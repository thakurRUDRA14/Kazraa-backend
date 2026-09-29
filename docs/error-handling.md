# Error Handling

## Strategy

Kazraa Backend uses NestJS's **built-in exception handling**. There are no custom exception filters or interceptors. All errors are thrown as `HttpException` subclasses and automatically serialized by the default NestJS exception filter.

## Exception Classes Used

| Exception | HTTP Status | When Used |
| --- | --- | --- |
| `BadRequestException` | 400 | Validation failures, invalid business logic (e.g., selling price > MRP, empty cart, insufficient stock) |
| `UnauthorizedException` | 401 | Invalid credentials, expired/missing JWT, invalid refresh token |
| `ForbiddenException` | 403 | Insufficient role (user is CUSTOMER but endpoint requires ADMIN) |
| `NotFoundException` | 404 | Entity not found (product, order, user, address, media, attribute, etc.) |
| `ConflictException` | 409 | Duplicate records (duplicate slug, SKU, email, phone, barcode, attribute assignment) |

## Response Format

All error responses follow the standard NestJS format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

For `ValidationPipe` errors (automatic DTO validation):

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

## Validation Layer

The global `ValidationPipe` (configured in `main.ts`) handles DTO validation:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // Strip unknown properties
  transform: true,             // Auto-transform types
  forbidNonWhitelisted: true,  // Reject unknown properties
}));
```

- **Decorators Used**: `@IsString()`, `@IsEmail()`, `@IsEnum()`, `@IsOptional()`, `@IsNumber()`, `@Min()`, `@MaxLength()`, `@MinLength()`, `@IsInt()`, `@IsNotEmpty()`, `@IsBoolean()`, `@IsArray()`, `@ValidateNested()`, `@Type()`
- **Validation errors** are returned as arrays of human-readable messages

## Business Logic Errors

Each service throws domain-specific exceptions:

### Auth
| Scenario | Exception |
| --- | --- |
| Email already registered | `ConflictException` |
| Phone already registered | `ConflictException` |
| Invalid email/phone or password | `UnauthorizedException` |
| Refresh token missing/invalid/revoked/expired | `UnauthorizedException` |
| User not found during token refresh | `UnauthorizedException` |
| Current password incorrect (change password) | `UnauthorizedException` |
| New password same as old | `BadRequestException` |

### Cart
| Scenario | Exception |
| --- | --- |
| Product size not found or inactive | `NotFoundException` |
| Insufficient stock | `BadRequestException` |
| Item not in cart | `NotFoundException` |
| Cart is empty (clear) | `BadRequestException` |

### Orders
| Scenario | Exception |
| --- | --- |
| Cart not found or empty | `BadRequestException` |
| Address not found | `NotFoundException` |
| Product not active | `BadRequestException` |
| ProductSize inactive or deleted | `BadRequestException` |
| Insufficient stock | `BadRequestException` |
| Order not found | `NotFoundException` |
| Invalid status transition (cancel) | Only PENDING/CONFIRMED can be cancelled |
| Invalid return (only DELIVERED → RETURN_REQUESTED) | `BadRequestException` |
| Invalid RTO (only SHIPPED → RTO) | `BadRequestException` |

### Payments
| Scenario | Exception |
| --- | --- |
| Order not found | `NotFoundException` |
| Payment not found | `NotFoundException` |
| Already paid | `BadRequestException` |
| COD — no provider needed | Returns payment directly |
| Provider order not created yet | `BadRequestException` |
| COD refund attempt | `BadRequestException` |
| Invalid refund amount | `BadRequestException` |
| Only PAID can be refunded | `BadRequestException` |

### Media
| Scenario | Exception |
| --- | --- |
| File missing | `BadRequestException` |
| File empty | `BadRequestException` |
| Unsupported MIME type | `BadRequestException` |
| File too large | `BadRequestException` |
| Media not found | `NotFoundException` |
| Media in use (cannot delete) | `ConflictException` |

### Catalog
| Scenario | Exception |
| --- | --- |
| Duplicate slug/name | `ConflictException` |
| Category not found | `NotFoundException` |
| Cannot delete category with products | `ConflictException` |
| Cannot delete category with children | `ConflictException` |
| Duplicate SKU/barcode | `ConflictException` |
| Selling price > MRP | `BadRequestException` |
| Wrong attribute value type | `BadRequestException` |

## Error Propagation

Services throw exceptions → NestJS catches them → serializes to JSON response. There is no global try/catch or error-logging middleware. Unhandled errors result in a 500 Internal Server Error with the default NestJS error body.

## What's NOT Implemented

- No custom exception filters
- No global error logging (no structured logger like Winston/Pino)
- No Sentry or external error tracking
- No request/response logging interceptors
- No rate limiting
- Payment provider errors (Cashfree SDK failures) propagate as unhandled 500 errors
