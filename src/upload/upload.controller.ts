import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipResponseWrap } from '../common/decorators/skip-response-wrap.decorator';
import { FirebaseService } from '../firebase/firebase.service';
import { MulterExceptionFilter } from './filters/multer-exception.filter';

@Controller('api/uploads')
export class UploadController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post()
  @SkipResponseWrap()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const url = await this.firebaseService.uploadImage(file, 'blog-uploads');
    return { url };
  }
}
