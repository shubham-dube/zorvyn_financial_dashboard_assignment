import { Role, UserStatus } from '../../types/common.types.js';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  updatedAt: Date;
}
