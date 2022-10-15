export class Config {
    static get mongoUri() {
        return process.env.DB_SERVER ?? 'mongodb://localhost:27017/appointments'
    }

    static get dbName() {
        return process.env.DB_NAME ?? 'appointments'
    }

    static get emailAddress() {
        return process.env.EMAIL_ADDRESS ?? 'pavelflegr@gmail.com'
    }

    static get awsAccessId() {
        return process.env.AWS_ACCESS_ID
    }

    static get awsAccessKey() {
        return process.env.AWS_ACCESS_KEY
    }
}