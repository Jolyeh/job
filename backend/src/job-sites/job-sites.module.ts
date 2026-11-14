import { Module } from '@nestjs/common';
import { JobSitesController } from './job-sites.controller';
import { JobSitesService } from './job-sites.service';

@Module({
  controllers: [JobSitesController],
  providers: [JobSitesService],
  exports: [JobSitesService],
})
export class JobSitesModule {}
