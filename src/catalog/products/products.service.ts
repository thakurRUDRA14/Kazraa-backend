// product/product.service.ts

import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PostgresService } from '../../database/postgres/postgres.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

import { CreateProductSizeDto } from './dto/create-product-size.dto';
import { UpdateProductSizeDto } from './dto/update-product-size.dto';

import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { UpdateProductAttributeDto } from './dto/update-product-attribute.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class ProductsService {
    constructor(
        private readonly prisma: PostgresService,
    ) { }

    // POST /catalog/products
    async create(createProductDto: CreateProductDto) {
        const {
            categoryId,
            name,
            shortDescription,
            description,
            seoTitle,
            seoDescription,
            seoKeywords,
            status,
            images,
            sizes,
            attributes,
        } = createProductDto;

        // --------------------------------
        // Check slug
        // --------------------------------

        const slug = generateSlug(name);
        const existingProduct =
            await this.prisma.product.findUnique({
                where: {
                    slug,
                },
            });

        if (existingProduct) {
            throw new ConflictException(
                'A product with this slug already exists',
            );
        }

        // --------------------------------
        // Check category
        // --------------------------------

        const category =
            await this.prisma.category.findFirst({
                where: {
                    id: categoryId,
                    deletedAt: null,
                    isActive: true,
                },
            });

        if (!category) {
            throw new NotFoundException(
                'Category not found',
            );
        }

        // --------------------------------
        // Validate sizes
        // --------------------------------

        if (sizes?.length) {
            const sizeIds = sizes.map(
                (item) => item.sizeId,
            );

            const uniqueSizeIds = new Set(sizeIds);

            if (uniqueSizeIds.size !== sizeIds.length) {
                throw new ConflictException(
                    'A product cannot have the same size more than once',
                );
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
                throw new NotFoundException(
                    'One or more sizes were not found',
                );
            }

            // Check duplicate SKUs
            const skus = sizes.map(
                (item) => item.sku,
            );

            if (new Set(skus).size !== skus.length) {
                throw new ConflictException(
                    'Duplicate SKU found',
                );
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
                throw new ConflictException(
                    `SKU ${existingSku.sku} already exists`,
                );
            }
        }

        // --------------------------------
        // Validate attributes
        // --------------------------------

        if (attributes?.length) {
            const attributeIds = attributes.map(
                (item) => item.attributeId,
            );

            if (
                new Set(attributeIds).size !==
                attributeIds.length
            ) {
                throw new ConflictException(
                    'A product cannot have the same attribute more than once',
                );
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
                    throw new NotFoundException(
                        `Attribute ${attribute.attributeId} not found`,
                    );
                }

                // If option is supplied,
                // validate that option belongs to this attribute.
                if (attribute.optionId) {
                    const option =
                        await this.prisma.attributeOption.findFirst({
                            where: {
                                id: attribute.optionId,
                                attributeId:
                                    attribute.attributeId,
                                isActive: true,
                            },
                        });

                    if (!option) {
                        throw new NotFoundException(
                            'Attribute option not found or does not belong to the attribute',
                        );
                    }
                }

                // SELECT / MULTI_SELECT should use options.
                if (
                    ['SELECT', 'MULTI_SELECT'].includes(
                        dbAttribute.type,
                    ) &&
                    !attribute.optionId
                ) {
                    throw new ConflictException(
                        `${dbAttribute.name} requires an attribute option`,
                    );
                }
            }
        }

        // --------------------------------
        // Create everything in transaction
        // --------------------------------

        return this.prisma.$transaction(
            async (tx) => {
                const product = await tx.product.create({
                    data: {
                        categoryId,
                        name,
                        slug,
                        shortDescription,
                        description,
                        seoTitle,
                        seoDescription,
                        seoKeywords,
                        status: status ?? 'DRAFT',

                        images: images?.length
                            ? {
                                create: images.map((image) => ({
                                    mediaId: image.mediaId,
                                    type:
                                        image.type ?? 'GALLERY',
                                    altText: image.altText,
                                    isPrimary:
                                        image.isPrimary ?? false,
                                    sortOrder:
                                        image.sortOrder ?? 0,
                                })),
                            }
                            : undefined,

                        sizes: sizes?.length
                            ? {
                                create: sizes.map((size) => ({
                                    sizeId: size.sizeId,
                                    sku: size.sku,
                                    barcode: size.barcode,
                                    mrp: size.mrp,
                                    sellingPrice:
                                        size.sellingPrice,
                                    availableStock:
                                        size.availableStock ?? 0,
                                    weight: size.weight,
                                    isActive:
                                        size.isActive ?? true,
                                })),
                            }
                            : undefined,

                        attributes: attributes?.length
                            ? {
                                create: attributes.map(
                                    (attribute) => ({
                                        attributeId:
                                            attribute.attributeId,
                                        optionId:
                                            attribute.optionId,
                                        value: attribute.value,
                                    }),
                                ),
                            }
                            : undefined,
                    },

                    include: {
                        category: true,

                        images: {
                            include: {
                                media: true,
                            },
                            orderBy: {
                                sortOrder: 'asc',
                            },
                        },

                        sizes: {
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
                                option: true,
                            },
                        },
                    },
                });

                return product;
            },
        );
    }

    // GET /catalog/products
    async findAll() {
        return this.prisma.product.findMany({
            where: {
                deletedAt: null,
            },

            orderBy: {
                createdAt: 'desc',
            },

            include: {
                category: true,

                images: {
                    include: {
                        media: true,
                    },
                    orderBy: {
                        sortOrder: 'asc',
                    },
                },

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
                        option: true,
                    },
                },
            },
        });
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

                    images: {
                        include: {
                            media: true,
                        },
                        orderBy: {
                            sortOrder: 'asc',
                        },
                    },

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
                            option: true,
                        },
                    },
                },
            });

        if (!product) {
            throw new NotFoundException(
                'Product not found',
            );
        }

        return product;
    }

    // PATCH /catalog/products/:id
    async update(
        id: string,
        updateProductDto: UpdateProductDto,
    ) {
        const existingProduct = await this.prisma.product.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });

        if (!existingProduct) {
            throw new NotFoundException('Product not found');
        }

        let slug = existingProduct.slug;

        // --------------------------------
        // Generate slug when name changes
        // --------------------------------

        if (
            updateProductDto.name &&
            updateProductDto.name !== existingProduct.name
        ) {
            const newSlug = generateSlug(updateProductDto.name);

            const duplicate = await this.prisma.product.findUnique({
                where: {
                    slug: newSlug,
                },
            });

            if (duplicate && duplicate.id !== id) {
                throw new ConflictException(
                    'A product with this name already exists',
                );
            }

            slug = newSlug;
        }

        // --------------------------------
        // Check category
        // --------------------------------

        if (
            updateProductDto.categoryId &&
            updateProductDto.categoryId !== existingProduct.categoryId
        ) {
            const category = await this.prisma.category.findFirst({
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

        return this.prisma.product.update({
            where: {
                id,
            },
            data: {
                ...updateProductDto,
                slug,
            },
            include: {
                category: true,

                images: {
                    include: {
                        media: true,
                    },
                },

                sizes: {
                    where: {
                        deletedAt: null,
                    },
                    include: {
                        size: true,
                    },
                },

                attributes: {
                    include: {
                        attribute: true,
                        option: true,
                    },
                },
            },
        });
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

        // Soft delete
        return this.prisma.product.update({
            where: {
                id,
            },
            data: {
                deletedAt: new Date(),
                status: 'ARCHIVED',
            },
        });
    }

    async createImage(
        productId: string,
        createImageDto: CreateProductImageDto,
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

        const media = await this.prisma.media.findUnique({
            where: {
                id: createImageDto.mediaId,
            },
        });

        if (!media) {
            throw new NotFoundException('Media not found');
        }

        // Only one primary image should exist.
        if (createImageDto.isPrimary) {
            await this.prisma.productImage.updateMany({
                where: {
                    productId,
                    isPrimary: true,
                },
                data: {
                    isPrimary: false,
                },
            });
        }

        return this.prisma.productImage.create({
            data: {
                productId,
                mediaId: createImageDto.mediaId,
                type: createImageDto.type ?? 'GALLERY',
                altText: createImageDto.altText,
                isPrimary: createImageDto.isPrimary ?? false,
                sortOrder: createImageDto.sortOrder ?? 0,
            },
            include: {
                media: true,
            },
        });
    }

    async updateImage(
        productId: string,
        imageId: string,
        updateImageDto: UpdateProductImageDto,
    ) {
        const image = await this.prisma.productImage.findFirst({
            where: {
                id: imageId,
                productId,
            },
        });

        if (!image) {
            throw new NotFoundException(
                'Product image not found',
            );
        }

        if (updateImageDto.mediaId) {
            const media = await this.prisma.media.findUnique({
                where: {
                    id: updateImageDto.mediaId,
                },
            });

            if (!media) {
                throw new NotFoundException('Media not found');
            }
        }

        if (updateImageDto.isPrimary === true) {
            await this.prisma.productImage.updateMany({
                where: {
                    productId,
                    id: {
                        not: imageId,
                    },
                    isPrimary: true,
                },
                data: {
                    isPrimary: false,
                },
            });
        }

        return this.prisma.productImage.update({
            where: {
                id: imageId,
            },
            data: updateImageDto,
            include: {
                media: true,
            },
        });
    }

    async removeImage(
        productId: string,
        imageId: string,
    ) {
        const image = await this.prisma.productImage.findFirst({
            where: {
                id: imageId,
                productId,
            },
        });

        if (!image) {
            throw new NotFoundException(
                'Product image not found',
            );
        }

        return this.prisma.productImage.delete({
            where: {
                id: imageId,
            },
        });
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

        return this.prisma.productSize.create({
            data: {
                productId,
                sizeId: createSizeDto.sizeId,
                sku: createSizeDto.sku,
                barcode: createSizeDto.barcode,
                mrp: createSizeDto.mrp,
                sellingPrice: createSizeDto.sellingPrice,
                availableStock:
                    createSizeDto.availableStock ?? 0,
                weight: createSizeDto.weight,
                isActive:
                    createSizeDto.isActive ?? true,
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

        const attribute =
            await this.prisma.attribute.findFirst({
                where: {
                    id: createAttributeDto.attributeId,
                    deletedAt: null,
                    isActive: true,
                },
            });

        if (!attribute) {
            throw new NotFoundException(
                'Attribute not found',
            );
        }

        const existing =
            await this.prisma.productAttribute.findUnique({
                where: {
                    productId_attributeId: {
                        productId,
                        attributeId:
                            createAttributeDto.attributeId,
                    },
                },
            });

        if (existing) {
            throw new ConflictException(
                'This attribute is already assigned to the product',
            );
        }

        if (createAttributeDto.optionId) {
            const option =
                await this.prisma.attributeOption.findFirst({
                    where: {
                        id: createAttributeDto.optionId,
                        attributeId:
                            createAttributeDto.attributeId,
                        isActive: true,
                    },
                });

            if (!option) {
                throw new NotFoundException(
                    'Attribute option not found or does not belong to this attribute',
                );
            }
        }

        return this.prisma.productAttribute.create({
            data: {
                productId,
                attributeId:
                    createAttributeDto.attributeId,
                optionId: createAttributeDto.optionId,
                value: createAttributeDto.value,
            },
            include: {
                attribute: true,
                option: true,
            },
        });
    }

    async updateAttribute(
        productId: string,
        attributeId: string,
        updateAttributeDto: UpdateProductAttributeDto,
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
            throw new NotFoundException(
                'Product attribute not found',
            );
        }

        if (updateAttributeDto.attributeId) {
            const attribute =
                await this.prisma.attribute.findFirst({
                    where: {
                        id: updateAttributeDto.attributeId,
                        deletedAt: null,
                        isActive: true,
                    },
                });

            if (!attribute) {
                throw new NotFoundException(
                    'Attribute not found',
                );
            }

            if (
                updateAttributeDto.attributeId !==
                attributeId
            ) {
                const duplicate =
                    await this.prisma.productAttribute.findUnique({
                        where: {
                            productId_attributeId: {
                                productId,
                                attributeId:
                                    updateAttributeDto.attributeId,
                            },
                        },
                    });

                if (duplicate) {
                    throw new ConflictException(
                        'This attribute is already assigned to the product',
                    );
                }
            }
        }

        const targetAttributeId =
            updateAttributeDto.attributeId ??
            attributeId;

        if (updateAttributeDto.optionId) {
            const option =
                await this.prisma.attributeOption.findFirst({
                    where: {
                        id: updateAttributeDto.optionId,
                        attributeId: targetAttributeId,
                        isActive: true,
                    },
                });

            if (!option) {
                throw new NotFoundException(
                    'Attribute option not found or does not belong to this attribute',
                );
            }
        }

        return this.prisma.productAttribute.update({
            where: {
                id: productAttribute.id,
            },
            data: updateAttributeDto,
            include: {
                attribute: true,
                option: true,
            },
        });
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
            throw new NotFoundException(
                'Product attribute not found',
            );
        }

        return this.prisma.productAttribute.delete({
            where: {
                id: productAttribute.id,
            },
        });
    }
}