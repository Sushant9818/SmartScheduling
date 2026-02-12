export interface Therapist {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
  specialties?: string[];
  rating?: number;
  imageUrl?: string;
}

export interface GetTherapistsParams {
  q?: string;
  specialty?: string;
  minRating?: number;
  page?: number;
  size?: number;
}
