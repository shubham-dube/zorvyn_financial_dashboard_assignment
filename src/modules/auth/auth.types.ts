import { Role } from '../../types/common.types.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
  tokens: AuthTokens;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  createdAt: Date;
}
