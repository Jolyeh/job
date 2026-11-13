import { ApplicationStatus } from '../../generated/prisma/enums';

export interface BookmarkOfferSummary {
  id: string;
  title: string;
  company: string;
  city: string;
  contractType: string;
  workMode: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  url: string;
  publishedAt: Date;
  logoUrl: string | null;
  skills: string[];
}

export interface BookmarkResponseDto {
  id: string;
  status: ApplicationStatus;
  matchScore: number;
  notes: string | null;
  appliedAt: Date | null;
  interviewAt: Date | null;
  nextActionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  offer: BookmarkOfferSummary;
  events: Array<{ id: string; status: ApplicationStatus; comment: string | null; createdAt: Date }>;
}

export interface BookmarkStatsDto {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  applied: number;
  responseRate: number;
  upcomingActions: number;
}
