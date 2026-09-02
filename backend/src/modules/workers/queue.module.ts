
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ThumbnailWorker } from './thumbnail.worker';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 }
    }),
    BullModule.registerQueue(
      { name: 'thumbnail' },
      { name: 'ocr' },
      { name: 'retention' },
      { name: 'drive-sync' }
    )
  ],
  // Registered as a provider so the @Processor('thumbnail') worker actually
  // starts consuming jobs - previously defined but never wired anywhere, so
  // jobs pushed onto the 'thumbnail' queue would sit unprocessed forever.
  providers: [ThumbnailWorker],
  exports: [BullModule]
})
export class QueueModule {}
