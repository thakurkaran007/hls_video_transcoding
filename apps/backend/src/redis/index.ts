import Redis from "ioredis";
import * as z from "zod";
import { REDIS_KEYS } from "@prisma/client";
import type { jobConfigSchema } from "../types";


class RedisClient {
    private static instance: RedisClient;
    private redis: Redis;

    private constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST,
            port: 6379,
        });
    }

    public static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    public async enqueueJobInQueue(job: z.infer<typeof jobConfigSchema>) {
        return await this.redis.lpush(
            REDIS_KEYS.VIDEO_PROCESSING_QUEUE,
            JSON.stringify(job)
        );
    }

    public async dequeueJobFromQueue() {
        const job = await this.redis.rpop(
            REDIS_KEYS.VIDEO_PROCESSING_QUEUE
        );
        return job ? JSON.parse(job) : null;
    }

    public async getKey(key: string) {
        return await this.redis.get(key);
    }

    public async incrementKey(key: string) {
        return await this.redis.incr(key);
    }

    public async decrementKey(key: string) {
        return await this.redis.decr(key);
    }

    public async deleteKey(key: string) {
        return await this.redis.del(key);
    }

    public async getQueueLength() {
        return await this.redis.llen(
            REDIS_KEYS.VIDEO_PROCESSING_QUEUE
        );
    }

    public async deleteAllKeys() {
        return await this.redis.flushall();
    }

    public async setKey(
        key: string,
        value: string,
        options: { EX?: number; NX?: boolean } = {}
    ) {
        try {
            const params: (string | number)[] = [key, value];

            if (options.EX) {
                params.push("EX", options.EX);
            }

            if (options.NX) {
                params.push("NX");
            }

            const res = await (this.redis as any).set(...params);

            if (res !== "OK") {
                throw new Error(`Failed to set key: ${key}`);
            }

            return true;
        } catch (error) {
            console.error("Error setting key in Redis:", error);
            return false;
        }
    }
}

export const redisClient = RedisClient.getInstance();