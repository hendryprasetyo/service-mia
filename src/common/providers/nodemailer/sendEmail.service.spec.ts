import { Test, TestingModule } from '@nestjs/testing';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import * as nodemailer from 'nodemailer';
import { EmailService } from './sendEmail.service';

jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService: EmailService;
  let logger: LoggerServiceImplementation;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
    } as unknown as LoggerServiceImplementation;

    sendMailMock = jest.fn();

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: LoggerServiceImplementation, useValue: logger },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(emailService).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const transactionid = 'tx123';
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test email text',
        html: '<p>Test email HTML</p>',
        transactionid,
      };
      sendMailMock.mockResolvedValue('Email sent');

      await emailService.sendEmail(emailData);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: process.env.MAIL_ID,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      });

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log an error and re-throw if sendEmail fails', async () => {
      const transactionid = 'tx123';
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test email text',
        html: '<p>Test email HTML</p>',
        transactionid,
      };
      const error = new Error('SMTP error');
      sendMailMock.mockRejectedValue(error);

      try {
        await emailService.sendEmail(emailData);
      } catch (error) {
        expect(error.message).toBe('SMTP error');
      }
    });
  });
});
