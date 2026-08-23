import slugify from 'slugify';

export function generateSlug(value: string): string {
    return slugify(value, {
        lower: true,
        strict: true,
        trim: true,
    });
}