import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Registry of every route this API serves. Extend it as new phases land
 * (e.g. `POST /migration/start` in Phase 5) so unknown-route errors always
 * point callers at something real.
 */
export const AVAILABLE_ENDPOINTS: readonly string[] = ['GET /health', 'GET /patients/test'];

/**
 * Global 404 filter — turns Nest's bare "Cannot GET /x" into an actionable
 * error that tells the caller what actually exists.
 *
 * Example: `GET /health/1` is not a route (`/health` takes no ID), so the
 * caller gets this hint instead of guessing.
 */
@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.NOT_FOUND).json({
      statusCode: HttpStatus.NOT_FOUND,
      message: `Cannot ${request.method} ${request.url}`,
      error: 'Not Found',
      availableEndpoints: [...AVAILABLE_ENDPOINTS],
    });
  }
}
