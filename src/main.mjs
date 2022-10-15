import Fastify from 'fastify'
import {MongoService} from "./mongo.service.mjs";
import {Config} from "./config.mjs";
import {AppointmentService} from "./appointment.service.mjs";
import {SegmentService} from "./segment.service.mjs";
import addFormats from "ajv-formats"
import {ReservationService} from "./reservation.service.mjs";
import {MailService} from "./mail.service.mjs";
import dayjs from "dayjs";
import * as dotenv from 'dotenv'

dotenv.config()

const fastify = Fastify({
    logger: true,
    ajv: {
        plugins: [[addFormats]],
    },
})

const dbService = new MongoService(Config.mongoUri, Config.dbName)
const appointmentService = new AppointmentService(dbService)
const segmentService = new SegmentService(dbService)
const reservationService = new ReservationService(dbService, segmentService)
const emailService = new MailService()

fastify.post('/reservation', {
    async handler (request, reply) {
        const reservation = await reservationService.createReservation(request.body)
        const email = await emailService.sendEmail("Reservation Created", `Your reservation for ${dayjs(reservation.start).format("DD. MM. YYYY HH:mm")} is registered`, reservation.email)
        fastify.log.info(email)
        return true
    },
    schema: {
        body: {
            required: ['segmentId', 'firstName', 'lastName', 'email'],
            type: 'object',
            properties: {
                segmentId: { type: 'string', format: 'uuid'},
                firstName: { type: 'string'},
                lastName: { type: 'string'},
                email: {type: 'string', format: 'email'}
            }
        }
    }
})

fastify.get('/segment/:appointmentId', async(request, reply) => {
    const segments = await segmentService.findSegments(request.params.appointmentId)
    const appointment = await appointmentService.getAppointment(request.params.appointmentId)

    return {segments, appointment: appointment.name}
})

fastify.get('/appointment', async (request, reply) => {
    return appointmentService.findAppointments()
})

fastify.post('/appointment', {
    async handler (request, reply) {
        const appointment = request.body
        await appointmentService.createAppointment(appointment)

        segmentService.processAppointment(appointment)
        return appointment
    },
    schema: {
        body: {
            type: 'object',
            required: ['name', 'volume', 'length', 'start', 'end', 'breaks', 'exclude'],
            properties: {
                name: { type: 'string' },
                volume: {type: 'number', multipleOf: 1},
                length: {type: 'string', format: 'duration'},
                start: {type: 'string', format: 'iso-date-time'},
                end: {type: 'string', format: 'iso-date-time'},
                breaks: {
                    type: 'array',
                    items: {
                        required: ['start', 'end'],
                        type: 'object',
                        properties: {
                            start:  {type: 'string', format: 'iso-time'},
                            end:  {type: 'string', format: 'iso-time'},
                        }
                    }
                },
                exclude: {
                    type: 'array',
                    items: { type: 'number', minimum: 1, maximum: 7 , multipleOf: 1}
                }
            }
        }
    }
})

const start = async () => {
    try {
        await fastify.listen({ port: 3000 })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()