import { RecordType } from '../../types/common.types.js';

export interface CategoryResponse {
  id: string;
  name: string;
  type: RecordType;
  isSystem: boolean;
  createdAt: Date;
}
