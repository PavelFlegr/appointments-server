import {SESClient, SendEmailCommand} from "@aws-sdk/client-ses";
import {Config} from "./config.ts";

export class SesMailService {
    client
    constructor() {
        this.client = new SESClient({region: "eu-central-1", credentials: {accessKeyId: Config.awsAccessId, secretAccessKey: Config.awsAccessKey}})
    }

    async sendEmail(subject, text, recipient, replyTo) {
        const command = new SendEmailCommand({
            Destination: {
                ToAddresses: [recipient]
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: text
                    },
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: subject
                },
            },
            Source: Config.fromAddress,
            ReplyToAddresses: [replyTo]
        })

        try {
            return await this.client.send(command)
        } catch(e) {
            console.error(JSON.stringify(e))

            return e
        }
    }
}