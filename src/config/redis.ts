import { createClient } from 'redis';

import { env } from './env';

import type { RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
const managedRedisClients = new Set<RedisClientType>();

const registerRedisClient = (client: RedisClientType): RedisClientType => {
  managedRedisClients.add(client);

  client.on('error', (error: Error) => {
    console.error('Redis client error:', error);
  });

  return client;
};

export const getRedisClient = (): RedisClientType => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = registerRedisClient(
    createClient({
      url: env.REDIS_URL,
    }),
  );

  return redisClient;
};

export const connectRedisClient = async (client: RedisClientType): Promise<RedisClientType> => {
  if (!client.isOpen) {
    await client.connect();
  }

  return client;
};

export const createRedisSocketAdapterClients = async (): Promise<{
  publisher: RedisClientType;
  subscriber: RedisClientType;
}> => {
  const publisher = await connectRedisClient(getRedisClient());
  const subscriber = registerRedisClient(publisher.duplicate());

  await connectRedisClient(subscriber);

  return {
    publisher,
    subscriber,
  };
};

export const disconnectRedis = async (): Promise<void> => {
  await Promise.allSettled(
    Array.from(managedRedisClients).map(async (client) => {
      if (client.isOpen) {
        await client.quit();
      }
    }),
  );
};
