import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { JobSearchResponse, JobSearchService } from './job-search.service';
import { JobAggregatorService } from './job-aggregator.service';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobSearch: JobSearchService,
    private readonly aggregator: JobAggregatorService,
  ) {}

  /** Recherche classée par pertinence selon le profil de l'utilisateur. */
  @Get()
  search(
    @CurrentUser('id') userId: string,
    @Query() filters: SearchJobsDto,
  ): Promise<JobSearchResponse> {
    return this.jobSearch.search(userId, filters);
  }

  /** Synchronise les providers externes puis renvoie les résultats à jour. */
  @Post('refresh')
  refresh(
    @CurrentUser('id') userId: string,
    @Body() filters: SearchJobsDto,
  ): Promise<JobSearchResponse> {
    return this.jobSearch.refresh(userId, filters);
  }

  @Get('sources')
  sources() {
    return this.aggregator.activeProviders.map((provider) => ({
      name: provider.name,
      label: provider.label,
    }));
  }

  @Get(':id')
  async detail(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const offer = await this.jobSearch.detail(userId, id);
    if (!offer) throw new NotFoundException('Offre introuvable');
    return offer;
  }
}
