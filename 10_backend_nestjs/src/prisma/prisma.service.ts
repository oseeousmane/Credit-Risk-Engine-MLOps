import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err: any) {
      // Log but keep the server alive — DB may be temporarily unavailable (Supabase paused,
      // offline dev, etc.). Individual queries will return proper 503 errors at runtime.
      this.logger.warn(`DB connection failed at startup: ${err.message}. Running in degraded mode.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
