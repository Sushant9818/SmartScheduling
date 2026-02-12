import type { Role } from "./auth";

export type UserStatus = "ACTIVE" | "DISABLED";

export interface UserDto {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: Role;
  status?: UserStatus;
  createdAt?: string;
}

export interface GetUsersParams {
  role?: Role;
  q?: string;
  status?: UserStatus;
  page?: number;
  size?: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  role: Role;
  status?: UserStatus;
  specialties?: string[];
}

export interface UpdateUserPayload {
  name?: string;
  role?: Role;
  status?: UserStatus;
  specialties?: string[];
}
