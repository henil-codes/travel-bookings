import { useFailedRefunds } from '../../hooks/useFailedRefunds';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';

export function AdminRefundOutboxPage() {
  const {
    data: rows,
    isLoading,
    isError,
  } = useFailedRefunds({ status: 'failed' });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Failed Refunds</h1>
      <p className="text-sm text-slate-500 mb-6">
        Refunds that exhausted retries and need manual attention.
      </p>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <Alert variant="error">Failed to load the refund outbox.</Alert>
      )}

      {!isLoading &&
        !isError &&
        rows &&
        (rows.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
            <p className="text-slate-500">
              No failed refunds. Everything's clear.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                className="bg-white rounded-xl border border-slate-200 p-4"
                key={row.id}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-slate-900">
                      Booking {row.bookingId.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {row.cancellationReason}
                    </p>
                  </div>
                  <Badge label={row.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Attempts</p>
                    <p className="font-medium text-slate-900">{row.attempts}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Last error</p>
                    <p className="font-medium text-slate-900 break-words">
                      {row.lastError ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Created</p>
                    <p className="font-medium text-slate-900">
                      {new Date(row.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
