import {Config} from "./config.mjs";
import nodemailer from "nodemailer";

export class SmtpMailService {
    transport
    constructor() {
        this.transport = nodemailer.createTransport({
            host: Config.smtpHost,
            port: Config.smtpPort,
            secure: true,
            auth: {
                user: Config.smtpUsername,
                pass: Config.smtpPassword,
            },
        });
    }

    async sendEmail(subject, text, recipient) {
        const message = {
            from: Config.fromAddress,
            to: recipient,
            subject: subject,
            html: text,

        };

        await this.transport.sendMail(message).catch(e => console.error(e))
    }
}