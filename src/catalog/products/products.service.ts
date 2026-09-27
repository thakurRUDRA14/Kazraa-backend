import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PostgresService } from '../../database/postgres/postgres.service';
import { generateSlug } from '../../common/utils/slug.util';
import { MediaEntityType, MediaStatus, MediaType, ProductStatus } from '../../../generated/prisma/enums';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { MediaService } from '../../media/media.service';
import { ProductMediaDto } from './dto/product-media.dto';

import { CreateProductSizeDto } from './dto/create-product-size.dto';
import { UpdateProductSizeDto } from './dto/update-product-size.dto';

import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';


@Injectable()
export class ProductsService {
    constructor(
        private readonly prisma: PostgresService,
        private readonly mediaService: MediaService,
    ) { }

    // POST /catalog/products
    async create(createProductDto: CreateProductDto) {
        const { categoryId, name, shortDescription, description, seoTitle, seoDescription, seoKeywords, status, media, sizes, attributes } = createProductDto;

        // Check slug
        const slug = generateSlug(name);

        const existingProduct =
            await this.prisma.product.findUnique({
                where: { slug },
            });

        if (existingProduct) {
            throw new ConflictException('A product with this slug already exists');
        }

        // Check category
        const category =
            await this.prisma.category.findFirst({
                where: {
                    id: categoryId,
                    deletedAt: null,
                    isActive: true,
                },
            });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        // Validate sizes
        if (sizes?.length) {
            const sizeIds = sizes.map((item) => item.sizeId);

            if (new Set(sizeIds).size !== sizeIds.length) {
                throw new ConflictException('A product cannot have the same size more than once',);
            }

            const existingSizes =
                await this.prisma.size.findMany({
                    where: {
                        id: {
                            in: sizeIds,
                        },
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                });

            if (existingSizes.length !== sizeIds.length) {
                throw new NotFoundException('One or more sizes were not found');
            }

            // Check duplicate SKUs
            const skus = sizes.map((item) => item.sku);

            if (new Set(skus).size !== skus.length) {
                throw new ConflictException('Duplicate SKU found');
            }

            const existingSku =
                await this.prisma.productSize.findFirst({
                    where: {
                        sku: {
                            in: skus,
                        },
                    },
                });

            if (existingSku) {
                throw new ConflictException(`SKU ${existingSku.sku} already exists`);
            }
        }

        // Validate attributes
        if (attributes?.length) {
            const attributeIds = attributes.map((item) => item.attributeId);

            // Same attribute cannot be assigned twice
            if (new Set(attributeIds).size !== attributeIds.length) {
                throw new ConflictException('A product cannot have the same attribute more than once');
            }

            for (const attribute of attributes) {
                const dbAttribute =
                    await this.prisma.attribute.findFirst({
                        where: {
                            id: attribute.attributeId,
                            deletedAt: null,
                            isActive: true,
                        },
                    });

                if (!dbAttribute) {
                    throw new NotFoundException(`Attribute ${attribute.attributeId} not found`);
                }

                const optionIds = attribute.optionIds ?? [];

                // Validate duplicate option IDs
                if (new Set(optionIds).size !== optionIds.length) {
                    throw new ConflictException(`Duplicate options found for ${dbAttribute.name}`);
                }

                // Validate options
                if (optionIds.length) {
                    const existingOptions =
                        await this.prisma.attributeOption.findMany({
                            where: {
                                id: {
                                    in: optionIds,
                                },
                                attributeId:
                                    attribute.attributeId,
                                isActive: true,
                            },
                            select: {
                                id: true,
                            },
                        });

                    if (existingOptions.length !== optionIds.length) {
                        throw new NotFoundException(`One or more options for ${dbAttribute.name} were not found or do not belong to this attribute`);
                    }
                }

                // Validate based on attribute type
                switch (dbAttribute.type) {
                    case 'SELECT':
                    case 'COLOR':
                    case 'BOOLEAN':
                        // Exactly one option required
                        if (optionIds.length !== 1) {
                            throw new BadRequestException(`${dbAttribute.name} requires exactly one option`);
                        }

                        if (attribute.value !== undefined) {
                            throw new BadRequestException(`${dbAttribute.name} does not accept a custom value`);
                        }

                        break;

                    case 'MULTI_SELECT':
                        // At least one option required
                        if (optionIds.length === 0) {
                            throw new BadRequestException(`${dbAttribute.name} requires at least one option`);
                        }

                        if (attribute.value !== undefined) {
                            throw new BadRequestException(`${dbAttribute.name} does not accept a custom value`);
                        }

                        break;

                    case 'TEXT':
                    case 'TEXTAREA':
                    case 'NUMBER':
                    case 'DATE':
                    case 'URL':
                        if (optionIds.length) {
                            throw new BadRequestException(`${dbAttribute.name} does not use attribute options`);
                        }

                        // Free-form value required
                        if (attribute.value === undefined) {
                            throw new BadRequestException(`${dbAttribute.name} requires a value`);
                        }

                        break;
                }
            }
        }

        // media validation
        await this.validateProductMedia(media);

        // Create everything in transaction
        return this.prisma.$transaction(
            async (tx) => {

                // 1. Create product
                const product =
                    await tx.product.create({
                        data: {
                            categoryId,
                            name,
                            slug,
                            shortDescription,
                            description,
                            seoTitle,
                            seoDescription,
                            seoKeywords,
                            status: status ?? ProductStatus.DRAFT,

                            // Sizes
                            sizes: sizes?.length
                                ? {
                                    create:
                                        sizes.map(
                                            (size) => ({
                                                sizeId: size.sizeId,
                                                sku: size.sku,
                                                barcode: size.barcode,
                                                mrp: size.mrp,
                                                sellingPrice: size.sellingPrice,
                                                availableStock: size.availableStock ?? 0,
                                                weight: size.weight,
                                                isActive: size.isActive ?? true,
                                            }),
                                        ),
                                }
                                : undefined,

                            // Attributes
                            attributes:
                                attributes?.length
                                    ? {
                                        create:
                                            attributes.map(
                                                (attribute) => ({
                                                    attributeId: attribute.attributeId,
                                                    value: attribute.value,
                                                    options: attribute.optionIds?.length
                                                        ? { create: attribute.optionIds.map((optionId) => ({ optionId })) }
                                                        : undefined,
                                                }),
                                            ),
                                    }
                                    : undefined,
                        },
                    });

                // 2. Attach media
                for (const item of media ?? []) {
                    await this.mediaService.attach(
                        {
                            mediaId: item.mediaId,
                            entityType: MediaEntityType.PRODUCT,
                            entityId: product.id,
                            role: item.role,
                            sortOrder: item.sortOrder ?? 0,
                        },
                        tx,
                    );
                }

                // 4. Return complete product
                const createdProduct = await tx.product.findUnique({
                    where: { id: product.id },
                    include: {
                        category: true,

                        sizes: {
                            include: { size: true },
                            orderBy: {
                                size: { sortOrder: 'asc' },
                            },
                        },

                        attributes: {
                            include: {
                                attribute: true,
                                options: {
                                    include: { option: true },
                                },
                            },
                        },
                    },
                });

                if (!createdProduct) {
                    throw new NotFoundException('Created product not found');
                }

                const mediaUsages = await tx.mediaUsage.findMany({
                    where: {
                        entityType: 'PRODUCT',
                        entityId: product.id,
                    },
                    include: { media: true },
                    orderBy: { sortOrder: 'asc' },
                });

                return {
                    ...createdProduct,
                    media: mediaUsages,
                };
            },
        );
    }

    // GET /catalog/products
    async findAll() {
        const products =
            await this.prisma.product.findMany({
                where: {
                    deletedAt: null,
                },

                orderBy: {
                    createdAt: 'desc',
                },

                include: {
                    category: true,

                    sizes: {
                        where: {
                            deletedAt: null,
                        },
                        include: {
                            size: true,
                        },
                        orderBy: {
                            size: {
                                sortOrder: 'asc',
                            },
                        },
                    },

                    attributes: {
                        include: {
                            attribute: true,
                            options: {
                                include: {
                                    option: true,
                                },
                            },
                        },
                    },
                },
            });

        if (!products.length) {
            return [];
        }

        const productIds = products.map((product) => product.id);

        const mediaUsages =
            await this.mediaService.getUsagesByEntities(
                MediaEntityType.PRODUCT,
                productIds,
                {
                    excludeDeleted: true,
                },
            );

        const mediaByProduct = new Map<string, typeof mediaUsages>();

        for (const usage of mediaUsages) {
            const existing = mediaByProduct.get(usage.entityId) ?? [];

            existing.push(usage);

            mediaByProduct.set(
                usage.entityId,
                existing,
            );
        }

        return products.map((product) => ({
            ...product,
            media: mediaByProduct.get(product.id) ?? [],
        }));
    }

    // GET /catalog/products/:id
    async findOne(id: string) {
        const product =
            await this.prisma.product.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },

                include: {
                    category: true,

                    sizes: {
                        where: { deletedAt: null },
                        include: { size: true },
                        orderBy: {
                            size: { sortOrder: 'asc' },
                        },
                    },

                    attributes: {
                        include: {
                            attribute: true,
                            options: {
                                include: { option: true },
                            },
                        },
                    },
                },
            });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const media = await this.mediaService.getUsages(MediaEntityType.PRODUCT, product.id);

        return { ...product, media };
    }

    // PATCH /catalog/products/:id
    async update(
        id: string,
        updateProductDto: UpdateProductDto,
    ) {
        // Find product
        const existingProduct =
            await this.prisma.product.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
            });

        if (!existingProduct) {
            throw new NotFoundException('Product not found');
        }

        // Generate slug when name changes
        let slug = existingProduct.slug;

        if (updateProductDto.name && updateProductDto.name !== existingProduct.name) {
            const newSlug = generateSlug(updateProductDto.name);
            const duplicate = await this.prisma.product.findUnique({ where: { slug: newSlug } });

            if (duplicate && duplicate.id !== id) {
                throw new ConflictException('A product with this name already exists');
            }

            slug = newSlug;
        }

        // Validate category when changed
        if (updateProductDto.categoryId && updateProductDto.categoryId !== existingProduct.categoryId) {
            const category =
                await this.prisma.category.findFirst({
                    where: {
                        id: updateProductDto.categoryId,
                        deletedAt: null,
                        isActive: true,
                    },
                });

            if (!category) {
                throw new NotFoundException('Category not found');
            }
        }

        // 4. Update product
        const updatedProduct =
            await this.prisma.product.update({
                where: { id },

                data: {
                    ...updateProductDto,
                    slug,
                },

                include: {
                    category: true,

                    sizes: {
                        where: { deletedAt: null },
                        include: { size: true },
                        orderBy: {
                            size: { sortOrder: 'asc' },
                        },
                    },

                    attributes: {
                        include: {
                            attribute: true,
                            options: {
                                include: { option: true },
                            },
                        },
                    },
                },
            });

        return updatedProduct;
    }

    // DELETE /catalog/products/:id
    async remove(id: string) {
        const product =
            await this.prisma.product.findFirst({
                where: {
                    id,
                    deletedAt: null,
                },
            });

        if (!product) {
            throw new NotFoundException(
                'Product not found',
            );
        }

        // return this.prisma.$transaction(
        //     async (tx) => {

        //         await tx.mediaUsage.deleteMany({
        //             where: {
        //                 entityType: MediaEntityType.PRODUCT,
        //                 entityId: id,
        //             },
        //         });

        //         return tx.product.update({
        //             where: { id },

        //             data: {
        //                 deletedAt: new Date(),
        //                 status: ProductStatus.ARCHIVED,
        //             },
        //         });
        //     },
        // );

        return this.prisma.product.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: ProductStatus.ARCHIVED,
            },
        });
    }

    // PUT /catalog/products/:id/media
    async updateMedia(
        productId: string,
        media: ProductMediaDto[],
    ) {
        // 1. Verify product
        const product =
            await this.prisma.product.findFirst({
                where: {
                    id: productId,
                    deletedAt: null,
                },
                select: { id: true },
            });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // 2. Validate media before modifying DB
        await this.validateProductMedia(media);

        // 3. Synchronize and return
        return this.prisma.$transaction(
            async (tx) => {
                await this.syncProductMedia(
                    productId,
                    media,
                    tx,
                );

                return tx.mediaUsage.findMany({
                    where: {
                        entityType: MediaEntityType.PRODUCT,
                        entityId: productId,
                    },
                    include: { media: true },
                    orderBy: { sortOrder: 'asc' },
                });
            },
        );
    }

    async createSize(
        productId: string,
        createSizeDto: CreateProductSizeDto,
    ) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                deletedAt: null,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const size = await this.prisma.size.findFirst({
            where: {
                id: createSizeDto.sizeId,
                isActive: true,
            },
        });

        if (!size) {
            throw new NotFoundException('Size not found');
        }

        const existingProductSize =
            await this.prisma.productSize.findUnique({
                where: {
                    productId_sizeId: {
                        productId,
                        sizeId: createSizeDto.sizeId,
                    },
                },
            });

        if (existingProductSize) {
            throw new ConflictException(
                'This size is already added to the product',
            );
        }

        const existingSku =
            await this.prisma.productSize.findUnique({
                where: {
                    sku: createSizeDto.sku,
                },
            });

        if (existingSku) {
            throw new ConflictException(
                'SKU already exists',
            );
        }

        if (createSizeDto.barcode) {
            const existingBarcode =
                await this.prisma.productSize.findUnique({
                    where: {
                        barcode: createSizeDto.barcode,
                    },
                });

            if (existingBarcode) {
                throw new ConflictException(
                    'Barcode already exists',
                );
            }
        }


        if (createSizeDto.sellingPrice > createSizeDto.mrp) {
            throw new BadRequestException(
                'Selling price must be less than or equal to MRP',
            );
        }


        return this.prisma.productSize.create({
            data: {
                productId,
                sizeId: createSizeDto.sizeId,
                sku: createSizeDto.sku,
                barcode: createSizeDto.barcode,
                mrp: createSizeDto.mrp,
                sellingPrice: createSizeDto.sellingPrice,
                availableStock: createSizeDto.availableStock ?? 0,
                weight: createSizeDto.weight,
                isActive: createSizeDto.isActive ?? true,
            },
            include: {
                size: true,
            },
        });
    }

    async updateSize(
        productId: string,
        productSizeId: string,
        updateSizeDto: UpdateProductSizeDto,
    ) {
        const productSize =
            await this.prisma.productSize.findFirst({
                where: {
                    id: productSizeId,
                    productId,
                    deletedAt: null,
                },
            });

        if (!productSize) {
            throw new NotFoundException(
                'Product size not found',
            );
        }

        if (updateSizeDto.sizeId) {
            const size = await this.prisma.size.findFirst({
                where: {
                    id: updateSizeDto.sizeId,
                    isActive: true,
                },
            });

            if (!size) {
                throw new NotFoundException('Size not found');
            }

            if (
                updateSizeDto.sizeId !== productSize.sizeId
            ) {
                const duplicate =
                    await this.prisma.productSize.findUnique({
                        where: {
                            productId_sizeId: {
                                productId,
                                sizeId: updateSizeDto.sizeId,
                            },
                        },
                    });

                if (duplicate) {
                    throw new ConflictException(
                        'This size is already added to the product',
                    );
                }
            }
        }

        if (updateSizeDto.sku) {
            const sku = await this.prisma.productSize.findUnique({
                where: {
                    sku: updateSizeDto.sku,
                },
            });

            if (sku && sku.id !== productSizeId) {
                throw new ConflictException(
                    'SKU already exists',
                );
            }
        }

        if (updateSizeDto.barcode) {
            const barcode =
                await this.prisma.productSize.findUnique({
                    where: {
                        barcode: updateSizeDto.barcode,
                    },
                });

            if (
                barcode &&
                barcode.id !== productSizeId
            ) {
                throw new ConflictException(
                    'Barcode already exists',
                );
            }
        }

        return this.prisma.productSize.update({
            where: {
                id: productSizeId,
            },
            data: updateSizeDto,
            include: {
                size: true,
            },
        });
    }

    async removeSize(
        productId: string,
        productSizeId: string,
    ) {
        const productSize =
            await this.prisma.productSize.findFirst({
                where: {
                    id: productSizeId,
                    productId,
                    deletedAt: null,
                },
            });

        if (!productSize) {
            throw new NotFoundException(
                'Product size not found',
            );
        }

        return this.prisma.productSize.update({
            where: {
                id: productSizeId,
            },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });
    }

    async createAttribute(
        productId: string,
        createAttributeDto: CreateProductAttributeDto,
    ) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                deletedAt: null,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        const attribute = await this.prisma.attribute.findFirst({
            where: {
                id: createAttributeDto.attributeId,
                deletedAt: null,
                isActive: true,
            },
        });

        if (!attribute) {
            throw new NotFoundException('Attribute not found');
        }

        // Check duplicate attribute
        const existing =
            await this.prisma.productAttribute.findUnique({
                where: {
                    productId_attributeId: {
                        productId,
                        attributeId: createAttributeDto.attributeId,
                    },
                },
            });

        if (existing) {
            throw new ConflictException('This attribute is already assigned to the product');
        }

        const optionIds = createAttributeDto.optionIds ?? [];

        // Check duplicate options
        if (new Set(optionIds).size !== optionIds.length) {
            throw new ConflictException(`Duplicate options found for ${attribute.name}`);
        }

        // Validate options
        if (optionIds.length) {
            const existingOptions =
                await this.prisma.attributeOption.findMany({
                    where: {
                        id: {
                            in: optionIds,
                        },
                        attributeId: createAttributeDto.attributeId,
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                });

            if (existingOptions.length !== optionIds.length) {
                throw new NotFoundException(`One or more options for ${attribute.name} were not found or do not belong to this attribute`);
            }
        }

        // Validate attribute value
        switch (attribute.type) {
            case 'SELECT':
            case 'COLOR':
                if (optionIds.length !== 1) {
                    throw new BadRequestException(`${attribute.name} requires exactly one option`);
                }

                if (createAttributeDto.value !== undefined) {
                    throw new BadRequestException(`${attribute.name} does not accept a custom value`);
                }

                break;

            case 'MULTI_SELECT':
                if (optionIds.length === 0) {
                    throw new BadRequestException(`${attribute.name} requires at least one option`);
                }

                if (createAttributeDto.value !== undefined) {
                    throw new BadRequestException(`${attribute.name} does not accept a custom value`);
                }

                break;

            case 'TEXT':
            case 'TEXTAREA':
            case 'NUMBER':
            case 'BOOLEAN':
            case 'DATE':
            case 'URL':
                if (createAttributeDto.value === undefined) {
                    throw new BadRequestException(`${attribute.name} requires a value`);
                }

                if (optionIds.length) {
                    throw new BadRequestException(`${attribute.name} does not use attribute options`);
                }

                break;
        }

        // Create product attribute
        return this.prisma.productAttribute.create({
            data: {
                productId,
                attributeId: createAttributeDto.attributeId,
                value: createAttributeDto.value,
                options: optionIds.length
                    ? {
                        create: optionIds.map((optionId) => ({ optionId })),
                    }
                    : undefined,
            },

            include: {
                attribute: true,
                options: {
                    include: { option: true },
                },
            },
        });
    }

    async updateAttribute(
        productId: string,
        attributeId: string,
        updateAttributeDto: UpdateProductAttributeDto,
    ) {
        // Find existing product attribute
        const productAttribute =
            await this.prisma.productAttribute.findUnique({
                where: {
                    productId_attributeId: {
                        productId,
                        attributeId,
                    },
                },
            });

        if (!productAttribute) {
            throw new NotFoundException('Product attribute not found');
        }

        // Determine target attribute
        const targetAttributeId = updateAttributeDto.attributeId ?? attributeId;

        const targetAttribute =
            await this.prisma.attribute.findFirst({
                where: {
                    id: targetAttributeId,
                    deletedAt: null,
                    isActive: true,
                },
            });

        if (!targetAttribute) {
            throw new NotFoundException('Attribute not found');
        }

        // Check duplicate attribute
        if (targetAttributeId !== attributeId) {
            const duplicate =
                await this.prisma.productAttribute.findUnique({
                    where: {
                        productId_attributeId: {
                            productId,
                            attributeId: targetAttributeId,
                        },
                    },
                });

            if (duplicate) {
                throw new ConflictException('This attribute is already assigned to the product');
            }
        }

        // Prepare option IDs
        const optionIds = updateAttributeDto.optionIds ?? [];

        // Check duplicate options
        if (new Set(optionIds).size !== optionIds.length) {
            throw new ConflictException(`Duplicate options found for ${targetAttribute.name}`);
        }

        // Validate options
        if (optionIds.length) {
            const existingOptions =
                await this.prisma.attributeOption.findMany({
                    where: {
                        id: {
                            in: optionIds,
                        },
                        attributeId: targetAttributeId,
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                });

            if (existingOptions.length !== optionIds.length) {
                throw new NotFoundException(`One or more options for ${targetAttribute.name} were not found or do not belong to this attribute`);
            }
        }

        // Validate based on attribute type
        switch (targetAttribute.type) {
            case 'SELECT':
            case 'COLOR':
                if (optionIds.length !== 1) {
                    throw new BadRequestException(`${targetAttribute.name} requires exactly one option`);
                }

                if (updateAttributeDto.value !== undefined) {
                    throw new BadRequestException(`${targetAttribute.name} does not accept a custom value`);
                }

                break;

            case 'MULTI_SELECT':
                if (optionIds.length === 0) {
                    throw new BadRequestException(`${targetAttribute.name} requires at least one option`);
                }

                if (updateAttributeDto.value !== undefined) {
                    throw new BadRequestException(`${targetAttribute.name} does not accept a custom value`);
                }

                break;

            case 'TEXT':
            case 'TEXTAREA':
            case 'NUMBER':
            case 'BOOLEAN':
            case 'DATE':
            case 'URL':
                if (updateAttributeDto.value === undefined) {
                    throw new BadRequestException(`${targetAttribute.name} requires a value`);
                }

                if (optionIds.length) {
                    throw new BadRequestException(`${targetAttribute.name} does not use attribute options`);
                }

                break;
        }

        // Update in transaction
        return this.prisma.$transaction(
            async (tx) => {
                // If attribute itself changes, update it first.
                const updatedAttribute =
                    await tx.productAttribute.update({
                        where: {
                            id: productAttribute.id,
                        },
                        data: {
                            attributeId: targetAttributeId,
                            value: updateAttributeDto.value,
                        },
                    });

                // Replace options
                await tx.productAttributeOption.deleteMany({
                    where: {
                        productAttributeId: productAttribute.id,
                    },
                });

                if (optionIds.length) {
                    await tx.productAttributeOption.createMany({
                        data: optionIds.map(
                            (optionId) => ({
                                productAttributeId: productAttribute.id,
                                optionId,
                            }),
                        ),
                    });
                }

                // Return updated attribute
                return tx.productAttribute.findUnique({
                    where: {
                        id: updatedAttribute.id,
                    },
                    include: {
                        attribute: true,

                        options: {
                            include: {
                                option: true,
                            },
                        },
                    },
                });
            },
        );
    }

    async removeAttribute(
        productId: string,
        attributeId: string,
    ) {
        const productAttribute =
            await this.prisma.productAttribute.findUnique({
                where: {
                    productId_attributeId: {
                        productId,
                        attributeId,
                    },
                },
            });

        if (!productAttribute) {
            throw new NotFoundException('Product attribute not found');
        }

        return this.prisma.productAttribute.delete({
            where: {
                id: productAttribute.id,
            },
        });
    }

    // helper
    private async syncProductMedia(
        productId: string,
        requestedMedia: ProductMediaDto[],
        tx: Prisma.TransactionClient,
    ) {
        // 1. Get existing media relationships
        const existing =
            await tx.mediaUsage.findMany({
                where: {
                    entityType: MediaEntityType.PRODUCT,
                    entityId: productId,
                },
            });

        const requestedIds = new Set(requestedMedia.map((item) => item.mediaId));

        // 2. Remove media that is no longer attached
        for (const usage of existing) {
            if (!requestedIds.has(usage.mediaId)) {
                await tx.mediaUsage.delete({
                    where: { id: usage.id },
                });
            }
        }

        // 3. Add/update requested media
        for (const item of requestedMedia) {
            const existingUsage = existing.find((usage) => usage.mediaId === item.mediaId);

            if (existingUsage) {
                await tx.mediaUsage.update({
                    where: { id: existingUsage.id },
                    data: {
                        role: item.role,
                        sortOrder: item.sortOrder ?? 0,
                    },
                });
            } else {
                await this.mediaService.attach(
                    {
                        mediaId: item.mediaId,
                        entityType: MediaEntityType.PRODUCT,
                        entityId: productId,
                        role: item.role,
                        sortOrder: item.sortOrder ?? 0,
                    },

                    tx,
                );
            }
        }
    }

    private async validateProductMedia(media: ProductMediaDto[] = []) {
        if (!media.length) { return; }

        const mediaIds = media.map((item) => item.mediaId);

        if (new Set(mediaIds).size !== mediaIds.length) {
            throw new ConflictException('The same media cannot be attached to a product more than once');
        }

        const records =
            await this.prisma.media.findMany({
                where: {
                    id: { in: mediaIds },

                    status: {
                        in: [MediaStatus.TEMPORARY, MediaStatus.ACTIVE],
                    },
                },

                select: {
                    id: true,
                    type: true,
                },
            });

        if (records.length !== mediaIds.length) {
            throw new NotFoundException('One or more media files were not found');
        }

        if (records.some((media) => media.type !== MediaType.IMAGE)) {
            throw new BadRequestException('Only images can be attached to products');
        }
    }
}