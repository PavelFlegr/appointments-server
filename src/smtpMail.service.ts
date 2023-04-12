import {Config} from "./config.js";
import nodemailer, { Transporter } from 'nodemailer';

export class SmtpMailService {
    transport: Transporter
    constructor() {
        this.transport = nodemailer.createTransport({
            host: Config.smtpHost,
            port: Config.smtpPort,
            auth: {
                user: Config.smtpUsername,
                pass: Config.smtpPassword,
            },
        });
    }

    async sendEmail(subject: string, text: string, recipient: string, replyTo: string) {
        const message = {
            from: Config.fromAddress,
            to: recipient,
            subject: subject,
            html: text,
            replyTo: replyTo,
        };

        await this.transport.sendMail(message).catch(e => console.error(e))
    }
}