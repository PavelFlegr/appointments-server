export interface ReservationModel {
  segmentId: string
  firstName: string
  lastName: string
  email: string
  timezone: string
  appointmentId: string
  start: Date
  end: Date
  id?: string
}