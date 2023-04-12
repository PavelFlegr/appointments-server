import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js"
import { Collection, Db } from 'mongodb';
import { AppointmentModel } from './model/appointment.model';
import { User } from './model/user.model';
import { nanoid } from 'nanoid';

dayjs.extend(utc)

export class AppointmentService {
    appointments: Collection<AppointmentModel>

    constructor(db: Db) {
        this.appointments = db.collection('appointment')
    }

    async getAppointment(id: string) {
        return this.appointments.findOne({ id })
    }

    async saveAppointment(appointment: AppointmentModel, user: User) {
        const original = await this.getAppointment(appointment.id)
        if(original.userId !== user.id) {
            throw new Error('no, bad human')
        }
        await this.appointments.updateOne({ id: appointment.id }, {$set: {...appointment}})

        return appointment
    }

    async createAppointment(appointment: AppointmentModel, user: User) {
        appointment.start = dayjs(appointment.start).toDate()
        appointment.end = dayjs(appointment.end).toDate()
        appointment.userId = user.id
        appointment.id = nanoid()
        await this.appointments.insertOne(appointment)

        return appointment
    }

    async findAppointments(user: User) {
        return this.appointments.find({userId: user.id}, {sort: {$natural: -1}}).toArray()
    }

    async deleteAppointment(id: string, user: User) {
        return this.appointments.deleteOne({id, userId: user.id})
    }
}