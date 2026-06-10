import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const configuredToken = this.config.get<string>('ADMIN_API_TOKEN');
    const suppliedToken = request.header('x-api-token');

    if (configuredToken) {
      return suppliedToken === configuredToken;
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException('ADMIN_API_TOKEN is required in production.');
    }

    return true;
  }
}

