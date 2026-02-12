export interface AdminOverviewStats {
  totalUsers: number;
  totalTherapists: number;
  upcomingSessions: number;
  cancelRate: number;
}

export interface SessionsPerWeekPoint {
  week: string;
  sessions: number;
}
