export interface AuditLogResponse {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}
