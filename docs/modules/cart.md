# Cart Module

**Path**: `src/cart/`

## Files

| File | Purpose |
| --- | --- |
| `cart.module.ts` | Imports `MediaModule` |
| `cart.controller.ts` | Cart endpoints — all require JWT auth |
| `cart.service.ts` | Cart operations with stock validation and media resolution |
| `dto/add-cart-item.dto.ts` | productSizeId (string), quantity (int, min 1) |
| `dto/update-cart-item.dto.ts` | quantity (int, min 1) |

## Dependencies

- **MediaModule** — for resolving primary product images in cart response

## Cart Lifecycle

```
(No cart) → User requests cart → ACTIVE cart created
    ↓
User adds items, updates quantities
    ↓
User places order → Cart status changes to CONVERTED
    ↓
(No cart) → Next cart request creates a new ACTIVE cart
```

- Each user can have **at most one ACTIVE cart** at a time
- A cart is never deleted, only converted
- `getOrCreate()` finds or creates the active cart

## Service Methods

### `getOrCreate(userId: string)`

1. Find existing `ACTIVE` cart for user (with items → productSize → product → size)
2. If not found, create a new empty cart
3. For each item, resolve primary media using `MediaService.getPrimary()`
4. Return cart with enriched items (product name, size label, image URL, prices)

**Return shape** (per item):
```json
{
  "id": "<cartItemId>",
  "quantity": 2,
  "product": {
    "id": "<productId>",
    "name": "Cotton T-Shirt",
    "slug": "cotton-t-shirt",
    "size": {
      "id": "<productSizeId>",
      "label": "M",
      "sku": "CT-M-001",
      "mrp": 999,
      "sellingPrice": 799,
      "availableStock": 50,
      "isActive": true
    },
    "primaryImage": "https://cloudinary.com/..."
  }
}
```

### `addItem(userId: string, dto: AddCartItemDto)`

1. Validate `productSizeId` exists and is active → `NotFoundException` if not
2. Validate stock ≥ requested quantity → `BadRequestException` if insufficient
3. Get or create active cart
4. If item already in cart → increment quantity
5. If new → create cart item
6. Return full cart via `getOrCreate()`

### `updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto)`

1. Find cart item (within user's active cart) → `NotFoundException` if not found
2. Validate stock for new quantity → `BadRequestException` if insufficient
3. Update quantity
4. Return full cart

### `removeItem(userId: string, cartItemId: string)`

1. Find cart item → `NotFoundException` if not found
2. Delete the item
3. Return full cart

### `clearCart(userId: string)`

1. Find active cart → `BadRequestException` if not found
2. Check cart has items → `BadRequestException` if empty
3. Delete all items (`deleteMany`)
4. Return full cart (now empty)

## Stock Validation

Stock is checked against `productSize.availableStock`:

```typescript
if (productSize.availableStock < dto.quantity) {
  throw new BadRequestException('Not enough stock available');
}
```

**Important**: Stock is checked at add/update time but **not reserved**. Stock is only decremented when the order is placed (in `OrdersService.createOrder()`). This means stock could be exhausted between cart addition and order placement.

## Cart-to-Order Handoff

When an order is created:
1. `OrdersService` reads the active cart's items
2. Validates stock again (at order time)
3. Decrements stock
4. Sets cart status to `CONVERTED`

The cart module itself does not participate in the order creation transaction.
