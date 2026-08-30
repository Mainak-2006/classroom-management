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
  private static readonly WINDOW_MS = 60_000;
  private static readonly MAX_ATTEMPTS = 10;
  private static readonly MAX_KEYS = 1_000;

  private readonly attempts = new Map<string, Counter>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      route?: { path?: string };
      headers?: Record<string, string | string[] | undefined>;
    }>();

    const forwarded = request.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim();
    const ip = forwardedIp || request.ip || 'unknown';
    const key = `${request.route?.path ?? 'auth'}:${ip}`;
    const now = Date.now();

    this.prune(now);

    const current = this.attempts.get(key);
    const counter =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + AuthRateLimitGuard.WINDOW_MS }
        : current;
    counter.count += 1;
    this.attempts.set(key, counter);

    if (counter.count > AuthRateLimitGuard.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many attempts. Please try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private prune(now: number): void {
    if (this.attempts.size <= AuthRateLimitGuard.MAX_KEYS) return;

    for (const [key, counter] of this.attempts) {
      if (counter.resetAt <= now) {
        this.attempts.delete(key);
      }
    }
  }
}
