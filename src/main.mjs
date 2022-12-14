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
import {LoginService} from "./login.service.mjs";
import fastifyJwt from "@fastify/jwt";
import timezone from "dayjs/plugin/timezone.js"

dayjs.extend(timezone)

dotenv.config()

const fastify = Fastify({
    logger: true,
    ajv: {
        plugins: [[addFormats]],
    },
})

fastify.register(fastifyJwt, {
    secret: Config.jwtSecret
})

fastify.decorate("authenticate", async function(request, reply) {
    try {
        await request.jwtVerify()
    } catch (err) {
        reply.send(err)
    }
})

const dbService = new MongoService(Config.mongoUri, Config.dbName)
const appointmentService = new AppointmentService(dbService)
const segmentService = new SegmentService(dbService)
const reservationService = new ReservationService(dbService, segmentService)
const emailService = new MailService()
const loginService = new LoginService(dbService)

fastify.delete('/reservation/:reservationId', async(request, reply) => {
    const {reservationId} = request.params
    const reservation = await reservationService.getReservation(reservationId)
    if(reservation) {
        const segment = await segmentService.getSegment(reservation.segmentId)
        await reservationService.deleteReservation(reservationId)
        await segmentService.updateVolume(segment.id, segment.volume + 1)

        return true
    }

    return false
})

fastify.post('/register', {
    async handler (request, reply) {
        return await loginService.register(request.body)
    },
    schema: {
        body: {
            required: ['email', 'password', 'verifyPassword'],
            type: 'object',
            properties: {
                password: { type: 'string', minLength: 1},
                email: {type: 'string', format: 'email', minLength: 1},
                verifyPassword: { type: 'string', minLength: 1 }
            }
        }
    }
})

fastify.post('/login', {
    async handler (request, reply) {
        const user = await loginService.login(request.body)
        if(user) {
            const token = fastify.jwt.sign(user)
            return {token}
        }

        return false
    },
    schema: {
        body: {
            required: ['email', 'password'],
            type: 'object',
            properties: {
                password: { type: 'string', minLength: 1},
                email: {type: 'string', format: 'email', minLength: 1},
            }
        }
    }

})

fastify.post('/reservation', {
    async handler (request, reply) {
        const reservation = await reservationService.createReservation(request.body)
        const time = dayjs(reservation.start).tz(reservation.timezone).format("DD. MM. YYYY HH:mm")
        const email = await emailService.sendEmail("Reservation Created",
            `Your reservation for ${time} is registered. You can cancel it by clicking <a href="${Config.appHost}/cancel/${reservation.id}">here</a>`, reservation.email)
        fastify.log.info(email)
        return true
    },
    schema: {
        body: {
            required: ['segmentId', 'firstName', 'lastName', 'email', 'timezone'],
            type: 'object',
            properties: {
                segmentId: { type: 'string', format: 'uuid'},
                firstName: { type: 'string', minLength: 1},
                lastName: { type: 'string', minLength: 1},
                email: {type: 'string', format: 'email', minLength: 1},
                timezone: {type: 'string'}
            }
        }
    }
})

fastify.get('/segment/:appointmentId', async(request, reply) => {
    const segments = await segmentService.findAvailableSegments(request.params.appointmentId)
    const appointment = await appointmentService.getAppointment(request.params.appointmentId)

    return {segments, appointment: appointment.name}
})

fastify.get('/appointment', {
    onRequest: [fastify.authenticate],
    async handler (request, reply) {
        const appointments = await appointmentService.findAppointments(request.user)

        const wait = appointments.map(async appointment => {
            appointment.reserved = await reservationService.findReservations(appointment.id).then(reservations => reservations.length)
            const segmentCount = await segmentService.findSegments(appointment.id).then(segments => segments.length)
            appointment.capacity = segmentCount * appointment.volume
        })

        await Promise.all(wait)

        return appointments
}})

fastify.get('/appointment/:appointmentId/reservations', {
    onRequest: [fastify.authenticate],
    async handler(request, reply) {
        const {appointmentId} = request.params
        const appointment = await appointmentService.getAppointment(appointmentId, request.user)
        if(!appointment) {
            throw new Error("appointment does not exist or the user doesn't have access")
        }

        return reservationService.findReservations(appointmentId)
    }})

fastify.delete('/appointment/:appointmentId', {
    onRequest: [fastify.authenticate],
    async handler(request, reply) {
        await appointmentService.deleteAppointment(request.params.appointmentId, request.user)
        await segmentService.deleteForAppointment(request.params.appointmentId, request.user)
}})

fastify.post('/appointment', {
    onRequest: [fastify.authenticate],
    async handler (request, reply) {
        const appointment = request.body
        await appointmentService.createAppointment(appointment, request.user)

        await segmentService.processAppointment(appointment)
        return appointment
    },
    schema: {
        body: {
            type: 'object',
            required: ['name', 'volume', 'length', 'start', 'end', 'breaks', 'exclude'],
            properties: {
                name: { type: 'string', minLength: 1},
                volume: {type: 'number', multipleOf: 1},
                length: {type: 'string', format: 'duration', minLength: 1},
                start: {type: 'string', format: 'iso-date-time', minLength: 1},
                end: {type: 'string', format: 'iso-date-time', minLength: 1},
                breaks: {
                    type: 'array',
                    items: {
                        required: ['start', 'end'],
                        type: 'object',
                        properties: {
                            start:  {type: 'string', format: 'iso-time', minLength: 1},
                            end:  {type: 'string', format: 'iso-time', minLength: 1},
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