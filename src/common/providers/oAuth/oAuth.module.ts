import { Module } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuthService } from './oAuth.service';
import { LoggerModule } from 'src/common/helpers/logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [
    OAuthService,
    {
      provide: 'OAuth2Client',
      useFactory: () =>
        new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_CLIENT_CALLBACK_URL,
        ),
    },
  ],
  exports: [OAuthService],
})
export class OAuthModule {}
