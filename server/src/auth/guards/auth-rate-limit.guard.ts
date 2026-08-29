import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface Counter {
  count: number;
  resetAt: number;
}

/** Small dependency-free limiter for credential endpoints. */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, Counter>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string; route?: { path?: string } }>();
    const key = `${request.route?.path ?? 'auth'}:${request.ip ?? 'unknown'}`;
    const now = Date.now();
    const current = this.attempts.get(key);
    const counter = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + 60_000 }
      : current;
    counter.count += 1;
    this.attempts.set(key, counter);
    if (counter.count > 10) {
      throw new HttpException('Too many attempts. Please try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
