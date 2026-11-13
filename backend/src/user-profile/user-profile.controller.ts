import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UserProfileService } from './user-profile.service';

@Controller('profile')
export class UserProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  @Get()
  get(@CurrentUser('id') userId: string): Promise<ProfileResponseDto> {
    return this.profileService.getByUserId(userId);
  }

  /** PUT idempotent : le formulaire envoie l'état complet du profil. */
  @Put()
  upsert(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.upsert(userId, dto);
  }

  @Delete()
  @HttpCode(200)
  remove(@CurrentUser('id') userId: string) {
    return this.profileService.remove(userId);
  }
}
