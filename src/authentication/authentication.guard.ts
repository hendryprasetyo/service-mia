import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { EncryptionService } from 'src/common/helpers/encryption/encryption.service';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import { DbService } from 'src/database/mysql/mysql.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly pool: DbService,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const accessToken = this.extractTokenFromHeader(request);
    if (!accessToken) {
      this.logger.error(['Authentication', 'AuthGuard', 'ERROR'], {
        messages: 'Access Token Not Found',
        transactionid: request.headers.transactionid,
      });
      throw new UnauthorizedException();
    }
    try {
      const response = await this.encryptionService.verifyTokenJwt<{
        id: string;
        role: string;
      }>(accessToken, process.env.ACCESS_TOKEN_SECRET);
      const findUser = await this.pool.executeRawQuery<{ id: string }[]>({
        transactionid: request.headers.transactionid,
        query: `SELECT id FROM users WHERE id = ?;`,
        params: [response.id],
        logName: 'GET USER AUTHENTICATION',
      });

      if (!findUser || !findUser?.length) {
        this.logger.error(['Authentication', 'AuthGuard', 'ERROR'], {
          messages: 'User Not Found',
          transactionid: request.headers.transactionid,
        });
        throw new UnauthorizedException();
      }

      request['auth'] = response;
    } catch (error) {
      this.logger.error(['Authentication', 'AuthGuard', 'ERROR'], {
        info: JSON.stringify(error),
        messages: error.message,
        transactionid: request.headers.transactionid,
      });

      if (error?.data?.status_code === '11403') {
        throw new ForbiddenException();
      }
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
