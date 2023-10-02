import { Collection, Db } from 'mongodb';
import { SegmentService } from './segment.service';
import { ReservationModel } from './model/reservation.model';
import { nanoid } from 'nanoid';

export class ReservationService {
    private reservations: Collection<ReservationModel>
    private segmentService: SegmentService

    constructor(db: Db, segmentService: SegmentService) {
        this.reservations = db.collection('reservation')
        this.segmentService = segmentService
    }

    async getReservation(id: string) {
        return this.reservations.findOne({id})
    }

    async createReservation(reservation: ReservationModel) {
        const segment = await this.segmentService.getSegment(reservation.segmentId)
        if (segment.volume === 0) {
            throw new Error("no empty spots")
        }
        reservation.appointmentId = segment.appointmentId
        reservation.start = segment.start
        reservation.end = segment.end
        reservation.id = nanoid()
        await this.segmentService.updateVolume(segment.id, segment.volume - 1)
        await this.reservations.insertOne(reservation)

        return reservation
    }

    async deleteReservation(id: string) {
        return this.reservations.deleteOne({id})
    }

    async findReservations(appointmentId: string) {
        return this.reservations.find({appointmentId}).project({cancelUrl: "$id", firstName: 1, lastName: 1, email: 1, start: 1, end: 1, appointmentId: 1, segmentId: 1}).toArray()
    }
}