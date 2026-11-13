import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplicationStatus } from '../generated/prisma/enums';
import { BookmarksService } from './bookmarks.service';
import {
  BookmarkResponseDto,
  BookmarkStatsDto,
} from './dto/bookmark-response.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

class BookmarkFilterDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBookmarkDto,
  ): Promise<BookmarkResponseDto> {
    return this.bookmarks.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: BookmarkFilterDto,
  ): Promise<BookmarkResponseDto[]> {
    return this.bookmarks.findAll(userId, query.status);
  }

  /** Déclaré avant `:id` pour ne pas être capturé par la route paramétrée. */
  @Get('stats')
  stats(@CurrentUser('id') userId: string): Promise<BookmarkStatsDto> {
    return this.bookmarks.stats(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BookmarkResponseDto> {
    return this.bookmarks.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBookmarkDto,
  ): Promise<BookmarkResponseDto> {
    return this.bookmarks.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.bookmarks.remove(userId, id);
  }
}
