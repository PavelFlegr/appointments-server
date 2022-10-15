import {SESClient, SendEmailCommand} from "@aws-sdk/client-ses";
import {Config} from "./config.mjs";

export class MailService {
    client
    constructor() {
        this.client = new SESClient({region: "eu-central-1", credentials: {accessKeyId: Config.awsAccessId, secretAccessKey: Config.awsAccessKey}})
    }

    async sendEmail(subject, text, recipient) {
        const command = new SendEmailCommand({
                Destination: {
                    ToAddresses: [recipient]
                },
                Message: {
                    Body: {
                        Text: {
                            Charset: "UTF-8",
                            Data: text
                        },
                    },
                    Subject: {
                        Charset: "UTF-8",
                        Data: subject
                    },
                },
                Source: Config.emailAddress
            }
        )

        try {
            return await this.client.send(command)
        } catch(e) {
            console.error(JSON.stringify(e))

            return e
        }
    }
}