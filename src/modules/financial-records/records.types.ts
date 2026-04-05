import { RecordType } from '../../types/common.types.js';

export interface RecordResponse {
  id: string;
  amount: string;
  type: RecordType;
  category: {
    id: string;
    name: string;
  };
  date: string;
  notes: string | null;
  createdBy: {
    id: string;
    name: string;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
