# Catalog Module

**Path**: `src/catalog/`

## Overview

The catalog module manages the product hierarchy: **Size Types → Sizes → Products ← Categories**, plus **Attributes** with **Options**. It contains 5 sub-modules and 1 stub.

## Module Registration

```typescript
// catalog.module.ts
@Module({
  imports: [MediaModule],  // For product/category media attachment
  controllers: [
    CategoriesController, ProductsController,
    SizeTypesController, SizesController,
    AttributesController, CollectionsController,
  ],
  providers: [
    CategoriesService, ProductsService,
    SizeTypesService, SizesService,
    AttributesService, CollectionsService,
  ],
})
export class CatalogModule {}
```

---

## Categories

**Path**: `src/catalog/categories/`

### Data Model

- Hierarchical (self-referential `parentId`)
- Slug auto-generated from name
- Supports a single primary image (via MediaUsage)
- Soft-delete with `deletedAt` + `isActive: false`

### Service Methods

| Method | Description |
| --- | --- |
| `create(dto)` | Validates slug uniqueness, parent existence, creates category + attaches image in transaction |
| `findAll()` | Returns all active categories with parent, product/children count, and primary media |
| `findOne(id)` | Returns category with parent, children, counts, and primary media |
| `update(id, dto)` | Validates slug uniqueness on name change, validates parent (cannot be self), updates |
| `remove(id)` | Blocks if has products or children, removes media usage, soft-deletes in transaction |
| `updateMedia(id, mediaId)` | Replaces primary image (service method exists but **not exposed via controller**) |
| `removeMedia(id)` | Removes primary image (service method exists but **not exposed via controller**) |

### Media Batch Loading

`findAll()` uses `getUsagesByEntities()` to batch-load primary images for all categories in a single query, then maps them using a `Map<entityId, media>`.

---

## Products

**Path**: `src/catalog/products/`

### Data Model

Products have a complex relationship model:

```
Product
  ├── Category (1:1)
  ├── ProductSize[] → Size (many-to-many via join table)
  ├── ProductAttribute[] → Attribute (many-to-many via join table)
  │     └── ProductAttributeOption[] → AttributeOption
  └── MediaUsage[] → Media (polymorphic)
```

### Service Methods

#### `create(dto: CreateProductDto)`

**The most complex method in the codebase.** In a single transaction:

1. Generate and validate slug
2. Validate category exists and is active
3. Validate all sizes exist and are active
4. Validate no duplicate sizes or SKUs (local and database)
5. Validate all attributes and their options by type:
   - `SELECT`, `COLOR`, `BOOLEAN` → exactly 1 option, no custom value
   - `MULTI_SELECT` → at least 1 option, no custom value
   - `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `URL` → custom value required, no options
6. Validate media (existence, type = IMAGE only, no duplicates)
7. Create product with nested sizes and attributes
8. Attach media via `MediaService.attach()`
9. Return product with all relations + media

#### `findAll()`

Batch loads:
1. All non-deleted products with category, sizes, attributes
2. All media usages for all product IDs (single query via `getUsagesByEntities`)
3. Maps media to products using a `Map`

#### `findOne(id)`

Returns product with all relations. ⚠️ **Bug**: `getUsages()` is called without `await`.

#### `update(id, dto)`

Validates slug change, category change. Only updates scalar fields on the product (does not update nested sizes/attributes).

#### `remove(id)`

Soft-deletes: sets `deletedAt` + `status: ARCHIVED`. Does **not** clean up media usage (commented-out transaction).

#### `updateMedia(productId, media[])`

Full replacement in a transaction:
1. Validate product
2. Validate all media items
3. `syncProductMedia()` — removes old usages, creates/updates new ones
4. Return updated media list

#### `createSize / updateSize / removeSize`

- Creates/updates/removes `ProductSize` records
- Validates size existence, SKU uniqueness, barcode uniqueness, selling price ≤ MRP
- `removeSize` is a soft-delete

#### `createAttribute / updateAttribute / removeAttribute`

- Creates/updates/removes `ProductAttribute` records with options
- Validates based on attribute type
- `updateAttribute` uses a transaction to replace options atomically

### Attribute Type Validation Rules

| Attribute Type | Options Required | Custom Value |
| --- | --- | --- |
| `SELECT` | Exactly 1 | ❌ Not allowed |
| `COLOR` | Exactly 1 | ❌ Not allowed |
| `BOOLEAN` | Exactly 1 (in `create`) / value (in standalone) | Mixed |
| `MULTI_SELECT` | At least 1 | ❌ Not allowed |
| `TEXT`, `TEXTAREA`, `NUMBER`, `DATE`, `URL` | ❌ Not allowed | ✅ Required |

> ⚠️ `BOOLEAN` handling is inconsistent between `create()` (requires 1 option) and `createAttribute()` (requires value).

---

## Size Types

**Path**: `src/catalog/size-types/`

Groups sizes into logical categories (e.g., "Clothing", "Footwear").

| Method | Description |
| --- | --- |
| `create(dto)` | Validates name/slug uniqueness |
| `findAll()` | Returns all active size types with their sizes |
| `findOne(id)` | Returns size type with sizes |
| `update(id, dto)` | Validates name/slug uniqueness on change |
| `remove(id)` | Blocks if sizes exist, soft-deletes |

---

## Sizes

**Path**: `src/catalog/sizes/`

Individual size values within a size type (e.g., "S", "M", "L" under "Clothing").

| Method | Description |
| --- | --- |
| `create(dto)` | Validates sizeType exists, label/value uniqueness within type |
| `findAll()` | Returns all active sizes with their sizeType |
| `findOne(id)` | Returns size with sizeType |
| `update(id, dto)` | Validates sizeType change, label/value uniqueness |
| `remove(id)` | Blocks if used in product sizes, soft-deletes |

---

## Attributes

**Path**: `src/catalog/attributes/`

Flexible product attributes with typed values and predefined options.

### Attribute Service Methods

| Method | Description |
| --- | --- |
| `create(dto)` | Validates name/slug uniqueness |
| `findAll()` | Returns active attributes with active options |
| `findOne(id)` | Returns attribute with options |
| `update(id, dto)` | Validates slug uniqueness on name change |
| `remove(id)` | Soft-deletes (no check for product usage) |
| `createOption(attrId, dto)` | Validates attribute, value uniqueness |
| `updateOption(attrId, optId, dto)` | Validates value uniqueness on label change |
| `removeOption(attrId, optId)` | **Hard deletes** (not soft-delete) |

---

## Collections

**Path**: `src/catalog/collections/`

⚠️ **STUB** — Both controller and service are empty classes with no methods. The `Collection` model exists in the Prisma schema and `MediaEntityType.COLLECTION` is defined, but no business logic is implemented.

---

## Slug Generation

All catalog entities use `generateSlug(name)` from `src/common/utils/slug.util.ts`:

```typescript
import slugify from 'slugify';
// Converts "Women's Tops" → "womens-tops"
```
