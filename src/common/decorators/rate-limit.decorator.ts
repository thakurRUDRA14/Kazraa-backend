import { Throttle } from '@nestjs/throttler';

export const PublicRateLimit = () =>
    Throttle({
        default: {
            limit: 120,
            ttl: 60_000,
        },
    });

export const MutationRateLimit = () =>
    Throttle({
        default: {
            limit: 30,
            ttl: 60_000,
        },
    });

export const SensitiveRateLimit = () =>
    Throttle({
        default: {
            limit: 10,
            ttl: 60_000,
        },
    });

export const CriticalRateLimit = () =>
    Throttle({
        default: {
            limit: 5,
            ttl: 60_000,
        },
    });