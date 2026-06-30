import { SeatTile } from './SeatTile';
import type { Seat } from '../../types/seat';

interface Props {
  seats: Seat[];
  selectedSeatId: string | null;
  currentUserId: string | null;
  onSeatSelect: (seat: Seat) => void;
}

export function SeatMap({
  seats,
  selectedSeatId,
  currentUserId,
  onSeatSelect,
}: Props) {
  const sorted = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);

  const rows: [Seat | null, Seat | null, Seat | null, Seat | null][] = [];
  for (let i = 0; i < sorted.length; i += 4) {
    rows.push([
      sorted[i] ?? null,
      sorted[i + 1] ?? null,
      sorted[i + 2] ?? null,
      sorted[i + 3] ?? null,
    ]);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Driver indicator */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 5 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Driver
        </div>
      </div>

      {/* Seat grid */}
      <div className="flex flex-col gap-2">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[1fr_1fr_0.5fr_1fr_1fr] gap-2 items-center"
          >
            {row[0] ? (
              <SeatTile
                seat={row[0]}
                isSelected={row[0].id === selectedSeatId}
                currentUserId={currentUserId}
                onSelect={onSeatSelect}
              />
            ) : (
              <div />
            )}
            {row[1] ? (
              <SeatTile
                seat={row[1]}
                isSelected={row[1].id === selectedSeatId}
                currentUserId={currentUserId}
                onSelect={onSeatSelect}
              />
            ) : (
              <div />
            )}
            {/* Aisle */}
            <div className="flex justify-center">
              <div className="w-px h-6 bg-slate-200" />
            </div>
            {row[2] ? (
              <SeatTile
                seat={row[2]}
                isSelected={row[2].id === selectedSeatId}
                currentUserId={currentUserId}
                onSelect={onSeatSelect}
              />
            ) : (
              <div />
            )}
            {row[3] ? (
              <SeatTile
                seat={row[3]}
                isSelected={row[3].id === selectedSeatId}
                currentUserId={currentUserId}
                onSelect={onSeatSelect}
              />
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
        {[
          { label: 'Available', className: 'bg-seat-available' },
          {
            label: 'Selected',
            className: 'bg-seat-mine ring-2 ring-slate-900 ring-offset-1',
          },
          { label: 'Locked', className: 'bg-seat-locked opacity-70' },
          { label: 'sold', className: 'bg-seat-sold opacity-50' },
        ].map(({ label, className }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 text-xs text-slate-500`}
          >
            <div className={`w-4 h-4 rounded-sm ${className}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
