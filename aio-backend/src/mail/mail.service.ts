import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('EMAIL_USERNAME'),
        pass: this.config.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendPasswordRecoveryEmail(email: string, token: string) {
    const client = this.config.get<string>('FRONTEND_HOME_URI');
    const htmlContent = this.readHtmlFile('reset-password.html').replace(
      '{{resetLink}}',
      `${client}/reset-password/${token}`,
    );

    await this.transporter.sendMail({
      from: '"AIO administration" <aionotification1@gmail.com>',
      to: email,
      subject: 'Password reset request',
      html: htmlContent,
    });
  }

  async sendPasswordRecoveryEmailMobile(email: string, token: string) {
    const htmlTemplate = this.readHtmlFile('reset-password-mobile.html');
    const htmlContent = htmlTemplate.replace('{{token}}', token);

    await this.transporter.sendMail({
      from: '"AIO administration" <aionotification1@gmail.com>',
      to: email,
      subject: 'Your Aio Password Reset Code',
      html: htmlContent,
    });
  }

  async sendConfirmationEmail(email: string, code: string) {
    const htmlContent = this.readHtmlFile('confirmation-code.html').replace(
      '{{code}}',
      `${code}`,
    );
    console.log('ujiaekrghbuiaerfgbh');
    await this.transporter.sendMail({
      from: '"AIO administration" <aionotification1@gmail.com>',
      to: email,
      subject: 'Email confirmation request',
      html: htmlContent,
    });
  }

  private readHtmlFile(filename: string) {
    const path = `${__dirname}/templates/${filename}`;
    return fs.readFileSync(path, 'utf-8');
  }
}
