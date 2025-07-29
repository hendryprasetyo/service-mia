import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor(private readonly logger: LoggerServiceImplementation) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_ID,
        pass: process.env.MAIL_MP,
      },
    });
  }

  async sendEmail(dataObject: {
    to: string;
    subject: string;
    text: string;
    html: string;
    transactionid: string;
  }): Promise<void> {
    const { to, subject, text, html, transactionid } = dataObject;
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_ID,
        to,
        subject,
        text,
        html,
      });
      return Promise.resolve();
    } catch (error) {
      this.logger.error(['sendEmail', 'Send Email Nodemailer', 'ERROR'], {
        info: `${error.message}`,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
