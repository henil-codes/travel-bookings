import type { Seat } from '../../types/seat';

const statusClasses: Record<string, string> = {
    available: 'bg-seat-avilable hover:bg-seat-mine text-white cursor-pointer',
    mine: 'bg-seat-min text-white ring-2 ring-offset-1 ring-slate-900 cursor-pointer',
    locked: 'bg-seat-locked text-white cursor-not-allowed opacity-70',
    reserved: 'bg-seat-reserved text-white cursor-not-allowed opacity-70',
    sold: 'bg-seat-sold text-white cursor-not-allowed opacity-50',
}

const seatTypeIcon: Record<string, string> = {
    standard: '',
    accessible: '♿',
    women_only: '♀',
}

interface Props {
    seat: Seat;
    isSelected: boolean;
    currentUserId: string | null;
    onSelect: (seat: Seat) => void;
}

export function SeatTile({ seat, isSelected, currentUserId, onSelect }: Props) {
    const isLockedByMe = seat.status === 'locked' && seat.lockedByUserId === currentUserId;
    const isClickable = seat.status === 'available' || isLockedByMe || isSelected;
    const effectiveStatus = isSelected || isLockedByMe ? 'mine' : seat.status;
    const classes = statusClasses[effectiveStatus] ?? statusClasses.sold;

    return (
        <button 
            disabled={!isClickable}
            onClick={() => isClickable && onSelect(seat)}
            title={`Seat ${seat.seatNumber} — ${seat.seatType} — ${(seat.price / 100).toLocaleString('en-IN')}`}
            className={`w-10 h-10 rounded-md text-xs font-semibold flex items-center justify-enter transition-all duration-150 select-none relative ${classes}`}
        >
            {seat.seatNumber}
            {seatTypeIcon[seat.seatType] && (
                <span className="absolute -top-1 -right-1 text-[8px]">
                    {seatTypeIcon[seat.seatType]}
                </span>
            )} 
        </button>
    )
}