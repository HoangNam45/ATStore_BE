import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { AccountService } from './account.service';

@Controller('account')
@UseGuards(FirebaseAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post('create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'displayImage', maxCount: 1 },
      { name: 'detailImages', maxCount: 8 },
    ]),
  )
  async createAccount(
    @UploadedFiles()
    files: {
      displayImage?: Express.Multer.File[];
      detailImages?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    // Validate display image
    if (!files?.displayImage || files.displayImage.length === 0) {
      throw new BadRequestException('Display image is required');
    }

    // Parse categories from JSON string
    let categories;
    try {
      categories = JSON.parse(body.categories);
    } catch {
      throw new BadRequestException('Invalid categories format');
    }

    // Validate required fields
    if (!body.game || !body.type) {
      throw new BadRequestException('Game and type are required');
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      throw new BadRequestException('At least one category is required');
    }

    // Create account
    const result = await this.accountService.createAccount({
      game: body.game,
      server: body.server,
      type: body.type,
      displayImage: files.displayImage[0],
      detailImages: files.detailImages || [],
      categories,
    });

    return result;
  }
}
