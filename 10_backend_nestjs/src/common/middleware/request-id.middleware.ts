import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const reqId = req.headers['x-request-id'] || randomUUID();
    (req as any).id = reqId; // attach to request for logger or other uses
    res.setHeader('x-request-id', reqId as string);
    next();
  }
}
