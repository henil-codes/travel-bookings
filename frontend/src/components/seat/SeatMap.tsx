import { useMemo } from 'react';
import { SeatTile } from './SeatTile';
import type { Seat } from '../../types/seat';

interface Slot {
  seatNumber: number;
  seat: Seat | null;
}

interface Props {
  seats: Seat[];
  capacity: number;
  selectedSeatIds: string[];
  currentUserId: string | null;
  onSeatToggle: (seat: Seat) => void;
}

export function SeatMap({
  seats,
  capacity,
  selectedSeatIds,
  currentUserId,
  onSeatToggle,
}: Props) {
  const seatByNumber = useMemo(() => new Map(seats.map((s) => [s.seatNumber, s])), [seats]);
  
  // Generate every slot 1.. capacity, and map to seat if exists
  const allSlots = useMemo<Slot[]>(
    () => Array.from({ length: capacity}, (_, i) => ({
      seatNumber: i + 1,
      seat: seatByNumber.get(i + 1) ?? null,
    })),
    [capacity, seatByNumber]
  )

  // Group into rows of 4 for a 2 + aisle + 2 bus layout
  const rows = useMemo(() => {
    const result: Slot[][] = [];
    for (let i = 0; i < allSlots.length; i += 4) {
      result.push(allSlots.slice(i, i + 4));
    }
    return result;
  }, [allSlots]);

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
              <SeatTile
                seat={row[0]?.seat ?? null}
                seatNumber={row[0]?.seatNumber ?? rowIndex * 4 + 1}
                isSelected={!!row[0]?.seat && selectedSeatIds.includes(row[0].seat.id)}
                currentUserId={currentUserId}
                onToggle={onSeatToggle}
              />
              <SeatTile
                seat={row[1]?.seat ?? null}
                seatNumber={row[1]?.seatNumber ?? rowIndex * 4 + 2}
                isSelected={!!row[1].seat && selectedSeatIds.includes(row[1].seat.id)}
                currentUserId={currentUserId}
                onToggle={onSeatToggle}
              />
            {/* Aisle */}
            <div className="flex justify-center">
              <div className="w-px h-6 bg-slate-200" />
            </div>
              <SeatTile
                seat={row[2]?.seat ?? null}
                seatNumber={row[2]?.seatNumber ?? rowIndex * 4 + 3}
                isSelected={!!row[2].seat && selectedSeatIds.includes(row[2].seat.id)}
                currentUserId={currentUserId}
                onToggle={onSeatToggle}
              />
              <SeatTile
                seat={row[3]?.seat ?? null}
                seatNumber={row[3]?.seatNumber ?? rowIndex * 4 + 4}
                isSelected={!!row[3].seat && selectedSeatIds.includes(row[3].seat.id)}
                currentUserId={currentUserId}
                onToggle={onSeatToggle}
              />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
        {[
          { label: 'Available', className: 'bg-seat-available' },
          {
            label: 'Selected',
            className: 'bg-brand-600 ring-2 ring-brand-900 ring-offset-1',
          },
          { label: 'Locked', className: 'bg-seat-locked opacity-60' },
          { label: 'sold', className: 'bg-seat-sold opacity-40' },
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
