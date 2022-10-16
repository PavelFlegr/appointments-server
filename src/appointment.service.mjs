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

    async createAppointment(appointment) {
        appointment.start = dayjs(appointment.start).toDate()
        appointment.end = dayjs(appointment.end).toDate()
        this.dbService.create(this.type, appointment)

        return appointment
    }

    async findAppointments() {
        return this.dbService.find(this.type, {}, {$natural: -1})
    }

    async deleteAppointment(id) {
        return this.dbService.delete(this.type, id)
    }
}