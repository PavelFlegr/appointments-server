export class Config {
    static get mongoUri(): string {
        return process.env.DB_SERVER ?? 'mongodb://localhost:27017/appointments'
    }

    static get dbName(): string {
        return process.env.DB_NAME ?? 'appointments'
    }

    static get fromAddress(): string {
        return process.env.FROM_ADDRESS
    }

    static get replyAddress(): string {
        return process.env.REPLY_ADDRESS ?? Config.fromAddress
    }

    static get awsAccessId(): string {
        return process.env.AWS_ACCESS_ID
    }

    static get awsAccessKey(): string {
        return process.env.AWS_ACCESS_KEY
    }

    static get appHost(): string {
        return process.env.APP_HOST ?? 'http://localhost:8080'
    }

    static get jwtSecret(): string {
        return process.env.JWT_SECRET ?? 'changeme'
    }

    static get smtpHost(): string {
        return process.env.SMTP_HOST
    }

    static get smtpUsername(): string {
        return process.env.SMTP_USERNAME ?? Config.fromAddress
    }

    static get smtpPassword(): string {
        return process.env.SMTP_PASSWORD
    }

    static get smtpPort(): number {
        return +process.env.SMTP_PORT ?? 587
    }
}