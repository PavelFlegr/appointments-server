export class ReservationService {
    type = 'reservation'
    dbService
    segmentService

    constructor(dbService, segmentService) {
        this.dbService = dbService
        this.segmentService = segmentService
    }

    async getReservation(id) {
        return this.dbService.get(this.type, id)
    }

    async createReservation(reservation) {
        const segment = await this.segmentService.getSegment(reservation.segmentId)
        if (segment.volume === 0) {
            throw new Error("no empty spots")
        }
        reservation.appointmentId = segment.appointmentId
        reservation.start = segment.start
        reservation.end = segment.end
        await this.segmentService.updateVolume(segment.id, segment.volume - 1)
        await this.dbService.create(this.type, reservation)

        return reservation
    }

    async deleteReservation(id) {
        return this.dbService.delete(this.type, id)
    }
}