import dayjs, { Dayjs } from 'dayjs';
import isoWeek from "dayjs/plugin/isoWeek.js"
import duration from "dayjs/plugin/duration.js"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js"
import isSameOrAfter from  "dayjs/plugin/isSameOrAfter.js"
import utc from "dayjs/plugin/utc.js"
import { Collection, Db } from 'mongodb';
import { SegmentModel } from './model/segment.model';
import { AppointmentModel, BreakData } from './model/appointment.model';
import { nanoid } from 'nanoid';
dayjs.extend(isoWeek)
dayjs.extend(duration)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(utc)

export class SegmentService {
    segments: Collection<SegmentModel>

    constructor(db: Db) {
        this.segments = db.collection('segment')
    }

    async getSegment(id: string) {
        return this.segments.findOne({id})
    }

    async deleteForAppointment(id: string) {
        return this.segments.deleteMany( {appointmentId: id})
    }

    async processAppointment(appointment: AppointmentModel) {
        const appointmentLength = dayjs.duration(appointment.length).asMinutes()
        const start = dayjs.utc(appointment.start)
        const end = dayjs.utc(appointment.end)
        const startDate = start.startOf('day')
        const endDate = end.startOf('day')
        const totalDays = endDate.diff(startDate, 'days')
        const endTime = end.subtract(totalDays, 'day')
        const dayLength = endTime.diff(start, 'minutes')
        const segmentsInDay = Math.floor(dayLength / appointmentLength)
        const breaks = appointment.breaks.map(breakData => ({
            start: dayjs.utc(start.format('YYYY-MM-DDT')+breakData.start),
            end: dayjs.utc(start.format('YYYY-MM-DDT')+breakData.end),
        }))
        const excludeDays = new Set<number>(appointment.exclude)

        for(let day = 0; day <= totalDays; day++) {
            const dayOfWeek = start.add(day, 'day').isoWeekday()
            if(excludeDays.has(dayOfWeek)) {
                continue
            }

            for(let segment = 0; segment < segmentsInDay; segment++) {
                const segmentStart = start.add(appointmentLength * segment, 'minute')
                const segmentEnd = segmentStart.add(appointmentLength, 'minute')

                if (this.hasBreakCollision(breaks, segmentStart, segmentEnd)) {
                    continue
                }

                const segmentData: SegmentModel = {
                    appointmentId: appointment.id,
                    start: segmentStart.add(day, 'day').toDate(),
                    end: segmentEnd.add(day, 'day').toDate(),
                    volume: appointment.volume
                }

                await this.createSegment(segmentData)
            }
        }
    }

    async updateVolume(id: string, volume: number) {
        await this.segments.updateOne({ id }, { $set: {volume} })
    }

    hasBreakCollision(breaks: { start: Dayjs, end: Dayjs }[], segmentStart: Dayjs, segmentEnd: Dayjs) {
        for (const breakData of breaks) {
            if(!(segmentStart.isBefore(breakData.start, 'minute') && segmentEnd.isSameOrBefore(breakData.start, 'minute') ||
                segmentStart.isSameOrAfter(breakData.end, 'minute') && segmentEnd.isAfter(breakData.start))) {
                return true
            }
        }

        return false
    }

    async createSegment(segment: SegmentModel) {
        segment.id = nanoid()
        await this.segments.insertOne(segment)

        return segment
    }

    async findAvailableSegments(appointmentId: string) {
        return this.segments.find({appointmentId, start: {$gte: dayjs().toDate()}}).toArray()
    }

    async findSegments(appointmentId: string) {
        return this.segments.find({appointmentId}).toArray()
    }
}