import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobSitesService } from './job-sites.service';
import {
  CreateJobSiteDto,
  JobSiteView,
  UpdateUserJobSiteDto,
} from './dto/job-site.dto';

@Controller('job-sites')
export class JobSitesController {
  constructor(private readonly jobSites: JobSitesService) {}

  /** Catalogue complet, avec l'état d'abonnement de l'utilisateur. */
  @Get()
  list(@CurrentUser('id') userId: string): Promise<JobSiteView[]> {
    return this.jobSites.list(userId);
  }

  /** Uniquement les sites suivis. */
  @Get('followed')
  followed(@CurrentUser('id') userId: string): Promise<JobSiteView[]> {
    return this.jobSites.listFollowed(userId);
  }

  /** Ajoute un site (catalogue ou personnalisé). */
  @Post()
  follow(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJobSiteDto,
  ): Promise<JobSiteView> {
    return this.jobSites.follow(userId, dto);
  }

  /** Met à jour l'abonnement (actif, identifiant de compte, notes). */
  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserJobSiteDto,
  ): Promise<JobSiteView> {
    return this.jobSites.updateFollow(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  unfollow(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.jobSites.unfollow(userId, id);
  }
}
