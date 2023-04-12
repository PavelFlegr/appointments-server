export interface AppointmentModel {
  name: string
  volume: number
  length: string
  start: Date
  end: Date
  breaks: BreakData[]
  exclude: []
  userId: string
  id?: string
}

export interface BreakData {
  start: string
  end: string
}