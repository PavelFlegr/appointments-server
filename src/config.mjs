export class Config {
    static get mongoUri() {
        return process.env.DB_SERVER ?? 'mongodb://localhost:27017/appointments'
    }

    static get dbName() {
        return process.env.DB_NAME ?? 'appointments'
    }

    static get fromAddress() {
        return process.env.FROM_ADDRESS ?? 'pavelflegr@gmail.com'
    }

    static get replyAddress() {
        return process.env.REPLY_ADDRESS ?? Config.fromAddress
    }

    static get awsAccessId() {
        return process.env.AWS_ACCESS_ID
    }

    static get awsAccessKey() {
        return process.env.AWS_ACCESS_KEY
    }

    static get appHost() {
        return process.env.APP_HOST ?? 'http://localhost:8080'
    }

    static get jwtSecret() {
        return process.env.JWT_SECRET ?? 'changeme'
    }
}