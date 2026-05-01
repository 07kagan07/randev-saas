import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const logger = new Logger('RedisModule');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const client = new Redis(url, {
          retryStrategy: (times) => {
            if (times > 10) {
              logger.error('Redis: max retries reached, giving up');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });
        client.on('error', (err) => logger.error('Redis connection error', err.message));
        client.on('connect', () => logger.log('Redis connected'));
        client.on('reconnecting', () => logger.warn('Redis reconnecting'));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
