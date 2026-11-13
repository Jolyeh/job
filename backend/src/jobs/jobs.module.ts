import { Module } from '@nestjs/common';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { JobAggregatorService } from './job-aggregator.service';
import { JobSearchService } from './job-search.service';
import { JobsController } from './jobs.controller';
import { FranceTravailProvider } from './providers/france-travail.provider';
import { JobProvider } from './providers/job-provider.interface';
import { LocalCatalogProvider } from './providers/local-catalog.provider';
import { RemotiveProvider } from './providers/remotive.provider';
import { JOB_PROVIDERS } from './providers/tokens';

@Module({
  imports: [UserProfileModule],
  controllers: [JobsController],
  providers: [
    FranceTravailProvider,
    RemotiveProvider,
    LocalCatalogProvider,
    {
      // Injection multi-fournisseurs : brancher une nouvelle source d'offres
      // consiste à l'ajouter à ce tableau.
      provide: JOB_PROVIDERS,
      inject: [FranceTravailProvider, RemotiveProvider, LocalCatalogProvider],
      useFactory: (
        franceTravail: FranceTravailProvider,
        remotive: RemotiveProvider,
        catalog: LocalCatalogProvider,
      ): JobProvider[] => [franceTravail, remotive, catalog],
    },
    JobAggregatorService,
    JobSearchService,
  ],
  exports: [JobAggregatorService, JobSearchService],
})
export class JobsModule {}
