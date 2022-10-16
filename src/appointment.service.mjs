import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js"

dayjs.extend(utc)

export class AppointmentService {
    type = 'appointment'
    dbService

    constructor(dbService) {
        this.dbService = dbService
    }

    async getAppointment(id) {
        return this.dbService.get(this.type, id)
    }

    async createAppointment(appointment, user) {
        appointment.start = dayjs(appointment.start).toDate()
        appointment.end = dayjs(appointment.end).toDate()
        appointment.userId = user.id
        this.dbService.create(this.type, appointment)

        return appointment
    }

    async findAppointments(user) {
        return this.dbService.find(this.type, {userId: user.id}, {$natural: -1})
    }

    async deleteAppointment(id, user) {
        return this.dbService.deleteWhere(this.type, {id, userId: user.id})
    }
}