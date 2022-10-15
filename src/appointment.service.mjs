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
        this.dbService.create(this.type, appointment)

        return appointment
    }

    async findAppointments() {
        return this.dbService.find(this.type)
    }
}