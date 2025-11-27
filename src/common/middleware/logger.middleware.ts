import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import morgan from 'morgan';

@Injectable()
export class MorganMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  private readonly logger: RequestHandler = morgan('dev');

  use(req: Request, res: Response, next: NextFunction): void {
    this.logger(req, res, next);
  }
}
