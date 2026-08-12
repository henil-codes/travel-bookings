export type OutboxStatus = 'pending' | 'processing' | 'failed' | 'completed';

export interface RefundOutboxRow {
  id: string;
  bookingId: string;
  cancellationReason: string;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  processedAt: string | null;
  leasedAt: string | null;
  nextAttemptAt: string;
  createdAt: string;
}

export interface RefundOutboxFilter {
    status?: OutboxStatus;
    page?: number;
    limit?: number;
}
