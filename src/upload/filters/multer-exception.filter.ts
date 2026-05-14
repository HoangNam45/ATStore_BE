import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'Image size exceeds 10MB.'
        : exception.message;

    response.status(400).json({ message });
  }
}
