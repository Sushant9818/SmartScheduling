export interface Availability {
  id: string;
  therapistId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  recurringWeekly?: boolean;
}

export interface CreateAvailabilityPayload {
  therapistId: string;
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
  recurringWeekly: boolean;
}

export interface UpdateAvailabilityPayload
  extends Partial<CreateAvailabilityPayload> {}

export interface GetAvailabilityParams {
  therapistId?: string;
}
