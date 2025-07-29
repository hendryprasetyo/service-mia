import { Inject, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google, oauth2_v2 } from 'googleapis';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';

@Injectable()
export class OAuthService {
  constructor(
    @Inject('OAuth2Client') private readonly oAuth2Client: OAuth2Client,
    private readonly logger: LoggerServiceImplementation,
  ) {}

  authorizationUrl(): string {
    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: JSON.parse(process.env.GOOGLE_CLIENT_SCOPES || '[""]'),
      include_granted_scopes: true,
    });
  }

  async userInfo(
    code: string,
    transactionId: string,
  ): Promise<oauth2_v2.Schema$Userinfo> {
    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({
        auth: this.oAuth2Client,
        version: 'v2',
      });

      const { data } = await oauth2.userinfo.get();
      return data;
    } catch (error) {
      this.logger.error(['OAuth Provider', 'UserInfo', 'ERROR'], {
        messages: error.message,
        transactionId,
      });
      return Promise.reject(error);
    }
  }
}

// import { Test, TestingModule } from '@nestjs/testing';
// import { OAuthService } from './oAuth.service';
// import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
// import { mockHeaders, mockLoggerService } from 'src/config/__test__/mock';

// // Mock OAuth2Client methods
// export const mockOAuth2Client = {
//   generateAuthUrl: jest.fn(() => 'https://mock-auth-url'), // Ensure this returns the URL
//   getToken: jest.fn(() =>
//     Promise.resolve({ tokens: { access_token: 'mock_token' } }),
//   ),
//   setCredentials: jest.fn(),
// };

// // Mock user info
// const mockUserInfo = {
//   id: '123456789',
//   email: 'test@example.com',
//   name: 'Test User',
// };

// // Mock google.oauth2
// jest.mock('googleapis', () => ({
//   google: {
//     auth: {
//       OAuth2: jest.fn().mockImplementation(() => ({
//         generateAuthUrl: jest.fn(() => 'https://mock-auth-url'),  // Correct mock for generateAuthUrl
//         getToken: jest.fn(() =>
//           Promise.resolve({ tokens: { access_token: 'mock_token' } }),
//         ),
//         setCredentials: jest.fn(),
//       })),
//     },
//     oauth2: jest.fn().mockReturnValue({
//       userinfo: {
//         get: jest.fn(() => Promise.resolve({ data: mockUserInfo })),
//       },
//     }),
//   },
// }));

// describe('OAuthService', () => {
//   let service: OAuthService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         OAuthService,
//         { provide: 'OAuth2Client', useValue: mockOAuth2Client },
//         { provide: LoggerServiceImplementation, useValue: mockLoggerService },
//       ],
//     }).compile();

//     service = module.get<OAuthService>(OAuthService);
//   });

//   describe('authorizationUrl', () => {
//     it('should return a valid Google auth URL', () => {
//       const url = service.authorizationUrl(mockHeaders.transactionid);
//       expect(url).toBe('https://mock-auth-url');  // Should now match
//     });

//     it('should log and throw error if generateAuthUrl fails', () => {
//       const error = new Error('Auth URL Error');
//       (mockOAuth2Client.generateAuthUrl as jest.Mock).mockImplementationOnce(
//         () => {
//           throw error;
//         },
//       );

//       expect(() => service.authorizationUrl(mockHeaders.transactionid)).toThrow(
//         'Failed to generate Google authorization URL.',
//       );

//       expect(mockLoggerService.error).toHaveBeenCalledWith(
//         ['OAuth Provider', 'Get URL', 'ERROR'],
//         {
//           messages: error.message,
//           transactionId: mockHeaders.transactionid,
//         },
//       );
//     });
//   });

//   describe('userInfo', () => {
//     it('should return user info on valid code', async () => {
//       const result = await service.userInfo(
//         'valid_code',
//         mockHeaders.transactionid,
//       );

//       expect(result).toEqual(mockUserInfo);
//       expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('valid_code');
//       expect(mockOAuth2Client.setCredentials).toHaveBeenCalled();
//     });

//     it('should log and throw error if token retrieval fails', async () => {
//       const error = new Error('Token error');
//       (mockOAuth2Client.getToken as jest.Mock).mockImplementationOnce(() => {
//         throw error;
//       });

//       await expect(
//         service.userInfo('bad_code', mockHeaders.transactionid),
//       ).rejects.toThrow('Failed to fetch user info from Google.');

//       expect(mockLoggerService.error).toHaveBeenCalledWith(
//         ['OAuth Provider', 'UserInfo', 'ERROR'],
//         {
//           messages: error.message,
//           transactionId: mockHeaders.transactionid,
//         },
//       );
//     });
//   });
// });
