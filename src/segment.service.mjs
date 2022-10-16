import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js"
import duration from "dayjs/plugin/duration.js"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js"
import isSameOrAfter from  "dayjs/plugin/isSameOrAfter.js"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(isoWeek)
dayjs.extend(duration)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(utc)

export class SegmentService {
    type = 'segment'
    dbService

    constructor(dbService) {
        this.dbService = dbService
    }

    async getSegment(id) {
        return this.dbService.get(this.type, id)
    }

    async processAppointment(appointment) {
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
        const excludeDays = new Set(appointment.exclude)

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

                const segmentData = {
                    appointmentId: appointment.id,
                    start: segmentStart.add(day, 'day').toDate(),
                    end: segmentEnd.add(day, 'day').toDate(),
                    volume: appointment.volume
                }

                await this.createSegment(segmentData)
            }
        }
    }

    async updateVolume(id, volume) {
        this.dbService.update(this.type, id, {volume})
    }

    hasBreakCollision(breaks, segmentStart, segmentEnd) {
        for (const breakData of breaks) {
            if(!(segmentStart.isBefore(breakData.start, 'minute') && segmentEnd.isSameOrBefore(breakData.start, 'minute') ||
                segmentStart.isSameOrAfter(breakData.end, 'minute') && segmentEnd.isAfter(breakData.start))) {
                return true
            }
        }

        return false
    }

    async createSegment(segment) {
        await this.dbService.create(this.type, segment)

        return segment
    }

    async findSegments(appointmentId) {
        return this.dbService.find(this.type, {appointmentId})
    }
}