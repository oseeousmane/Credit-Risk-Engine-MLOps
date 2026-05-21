import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const reqId = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).id = reqId;
    res.setHeader('x-request-id', reqId);
    // Seed AsyncLocalStorage so all downstream logs carry requestId automatically
    requestContext.run({ requestId: reqId }, next);
  }
}
