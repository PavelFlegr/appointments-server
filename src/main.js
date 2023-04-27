import Fastify from 'fastify'
import {Config} from "./config.js";
import {AppointmentService} from "./appointment.service.js";
import {SegmentService} from "./segment.service.js";
import addFormats from "ajv-formats"
import {ReservationService} from "./reservation.service.js";
import dayjs from "dayjs";
import * as dotenv from 'dotenv'
import {UserService} from "./user.service.js";
import fastifyJwt from "@fastify/jwt";
import timezone from "dayjs/plugin/timezone.js"
import {SmtpMailService} from "./smtpMail.service.js";
import {MongoClient} from "mongodb";

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
const mongoClient = new MongoClient(Config.mongoUri)
const db = mongoClient.db(Config.dbName)
const appointmentService = new AppointmentService(db)
const segmentService = new SegmentService(db)
const reservationService = new ReservationService(db, segmentService)
const emailService = new SmtpMailService()
const userService = new UserService(db)

fastify.delete('/reservation/:reservationId', async(request) => {
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
    async handler (request) {
        return await userService.register(request.body)
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
    async handler (request) {
        const user = await userService.login(request.body)
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

const style = `box-shadow:inset 0px 1px 0px 0px #f5978e;
	background:linear-gradient(to bottom, #f24537 5%, #c62d1f 100%);
	background-color:#f24537;
	border-radius:6px;
	border:1px solid #d02718;
	display:inline-block;
	cursor:pointer;
	color:#ffffff;
	font-family:Arial;
	font-size:15px;
	font-weight:bold;
	padding:6px 24px;
	text-decoration:none;
	text-shadow:0px 1px 0px #810e05;`

fastify.post('/reservation', {
    async handler (request) {
        // TODO: use aggregation
        const reservation = await reservationService.createReservation(request.body)
        const appointment = await appointmentService.getAppointment(reservation.appointmentId)
        const appointmentOwner = await userService.getUser(appointment.userId)
        const time = dayjs(reservation.start).tz(reservation.timezone).format("DD. MM. YYYY HH:mm")
        emailService.sendEmail("Reservation Created",
            `Your reservation for ${time} is registered. You can cancel it by clicking <a style="${style}" href="${Config.appHost}/cancel/${reservation.id}">here</a><div style="min-height: 300px">${appointment.instructions}</div>`, reservation.email, appointmentOwner.email)
            .catch(e => console.error(`sending email failed: ${JSON.stringify(e)}`))

        return true
    },
    schema: {
        body: {
            required: ['segmentId', 'firstName', 'lastName', 'email', 'timezone'],
            type: 'object',
            properties: {
                segmentId: { type: 'string' },
                firstName: { type: 'string', minLength: 1},
                lastName: { type: 'string', minLength: 1},
                email: {type: 'string', format: 'email', minLength: 1},
                timezone: {type: 'string'}
            }
        }
    }
})

fastify.get('/segment/:appointmentId', async(request) => {
    const { appointmentId } = request.params
    const segments = await segmentService.findAvailableSegments(appointmentId)
    const appointment = await appointmentService.getAppointment(appointmentId)

    return {segments, appointment: appointment.name}
})

fastify.get('/appointment', {
    onRequest: [fastify.authenticate],
    async handler (request) {
        const appointments = await appointmentService.findAppointments(request.user)

        const wait = appointments.map(async appointment => {
            appointment.reserved = await reservationService.findReservations(appointment.id).then(reservations => reservations.length)
            const segmentCount = await segmentService.findSegments(appointment.id).then(segments => segments.length)
            appointment.capacity = segmentCount * appointment.volume

            return appointment
        })

        await Promise.all(wait)

        return appointments
}})

fastify.get('/appointment/:appointmentId/reservations', {
    onRequest: [fastify.authenticate],
    async handler(request) {
        const {appointmentId} = request.params
        const appointment = await appointmentService.getAppointment(appointmentId, request.user)
        if(!appointment) {
            throw new Error("appointment does not exist or the user doesn't have access")
        }

        return reservationService.findReservations(appointmentId)
    }})

fastify.get('/appointment/:appointmentId', {
    onRequest: [fastify.authenticate],
    async handler(request) {
        const test = await appointmentService.getAppointment(request.params.appointmentId, request.user)
        return test
    }})

fastify.delete('/appointment/:appointmentId', {
    onRequest: [fastify.authenticate],
    async handler(request) {
        await appointmentService.deleteAppointment(request.params.appointmentId, request.user)
        await segmentService.deleteForAppointment(request.params.appointmentId, request.user)
}})

fastify.post('/appointment', {
    onRequest: [fastify.authenticate],
    async handler (request) {
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
                instructions: {type: 'string', default: ''},
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

fastify.put('/appointment', {
    onRequest: [fastify.authenticate],
    async handler (request) {
        const appointment = request.body
        await appointmentService.saveAppointment(appointment, request.user)
        return appointment
    },
    schema: {
        body: {
            type: 'object',
            required: ['id', 'name', 'volume', 'length', 'start', 'end', 'breaks', 'exclude'],
            properties: {
                id: { type: 'string', minLength: 1 },
                name: { type: 'string', minLength: 1},
                volume: {type: 'number', multipleOf: 1},
                length: {type: 'string', format: 'duration', minLength: 1},
                start: {type: 'string', format: 'iso-date-time', minLength: 1},
                end: {type: 'string', format: 'iso-date-time', minLength: 1},
                instructions: {type: 'string', default: ''},
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