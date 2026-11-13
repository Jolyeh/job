import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      const db = await this.prisma.ping();
      const [offers, profiles] = await Promise.all([
        this.prisma.jobOffer.count(),
        this.prisma.profile.count(),
      ]);
      return {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        database: db,
        catalog: { offers, profiles },
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        message: error instanceof Error ? error.message : 'Base injoignable',
      });
    }
  }
}
