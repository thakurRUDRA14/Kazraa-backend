# Users Module

**Path**: `src/users/`

## Files

| File | Purpose |
| --- | --- |
| `users.module.ts` | Provides `UsersService`, `AddressesService`, exports both |
| `users.controller.ts` | Profile endpoints: GET/PATCH/DELETE `/users/me` |
| `users.service.ts` | User CRUD, password change, soft-delete |
| `dto/update-user.dto.ts` | firstName, lastName, phone (all optional, max lengths) |
| `dto/change-password.dto.ts` | currentPassword, newPassword (min 8) |
| `dto/create-user.dto.ts` | ⚠️ Empty file (unused) |
| `addresses/` | Address management sub-module |

## Dependencies

- **PostgresModule** (global) — for database access
- No explicit imports — self-contained

## UsersService Methods

### `findByEmail(email: string)`

Returns user by email. Used by `AuthService` for login.

### `findByPhone(phone: string)`

Returns user by phone. Used by `AuthService` for login.

### `findById(id: string)`

Returns user by ID. Used by `AuthService` for token refresh.

### `create(data: { email, phone, password })`

Creates a new user. Used by `AuthService.register()`.

### `getProfile(userId: string)`

Returns user profile excluding `password` and `isDeleted` fields using Prisma `select`.

### `updateProfile(userId: string, dto: UpdateUserDto)`

1. Find user by ID → `NotFoundException` if not found or deleted
2. Update firstName, lastName, phone
3. Return updated profile (select excludes password)

### `changePassword(userId: string, dto: ChangePasswordDto)`

1. Find user by ID → `NotFoundException` if not found
2. Compare current password → `UnauthorizedException` if wrong
3. Check new ≠ old → `BadRequestException` if same
4. Hash new password with bcrypt (reads `BCRYPT_SALT_ROUNDS` from `process.env`)
5. Update password in DB
6. Return `{ message: "Password changed successfully" }`

### `remove(userId: string)`

1. Find user by ID → `NotFoundException` if not found or already deleted
2. Set `isDeleted: true` (soft delete)
3. Return `{ message: "Account deleted successfully" }`

---

# Addresses Sub-Module

**Path**: `src/users/addresses/`

## Files

| File | Purpose |
| --- | --- |
| `addresses.controller.ts` | Nested under `/users/me/addresses` |
| `addresses.service.ts` | Address CRUD with default-address logic |
| `dto/create-address.dto.ts` | All address fields with validation |
| `dto/update-address.dto.ts` | Extends create DTO (PartialType) |

## AddressesService Methods

### `findAll(userId: string)`

Returns all non-deleted addresses for the user, ordered by `isDefault DESC, createdAt DESC`.

### `findOne(userId: string, addressId: string)`

Returns a single address. Validates ownership and not-deleted.

### `create(userId: string, dto: CreateAddressDto)`

Uses a **transaction** for atomicity:

1. If `isDefault: true` → unset all other addresses' `isDefault` flag
2. If this is the user's first address → automatically set as default
3. Create the address
4. Return created address

### `update(userId: string, addressId: string, dto: UpdateAddressDto)`

Uses a **transaction**:

1. Find address → `NotFoundException` if not found or deleted
2. If `isDefault: true` → unset all other addresses' `isDefault` flag
3. Update the address
4. Return updated address

### `remove(userId: string, addressId: string)`

Uses a **transaction**:

1. Find address → `NotFoundException`
2. Soft-delete (set `deletedAt`)
3. If the deleted address was default → promote another address as default (the most recently created one)
4. Return `{ message: "Address deleted successfully" }`

## Default Address Logic

- Only one address per user can be `isDefault: true`
- Creating a new default unsets all others
- Deleting the default promotes the next most recent address
- First address is always set as default
- This is enforced at the application level, not the database level
