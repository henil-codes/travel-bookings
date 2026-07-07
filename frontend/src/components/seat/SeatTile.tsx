import type { Seat } from '../../types/seat';

const statusClasses: Record<string, string> = {
    available: 'bg-seat-available hover:opacity-80 text-white cursor-pointer',
    selected: 'bg-brand-600 text-white ring-2 ring-brand-900 ring-offset-1 cursor-pointer',
    lockedByMe: 'bg-seat-mine text-white ring-2 ring-offset-1 ring-slate-700 cursor-pointer',
    locked: 'bg-seat-locked text-white cursor-not-allowed opacity-60',
    reserved: 'bg-seat-reserved text-white cursor-not-allowed opacity-60',
    sold: 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-40',
    placeholder: 'bg-slate-100 text-slate-300 cursor-not-allowed border border-dashed border-slate-300',
}

const seatTypeIcon: Record<string, string> = {
    standard: '',
    accessible: '♿',
    women_only: '♀',
}

interface Props {
    seat: Seat | null;
    seatNumber: number;
    isSelected: boolean;
    currentUserId: string | null;
    onToggle: (seat: Seat) => void;
}

export function SeatTile({ seat, seatNumber, isSelected, currentUserId, onToggle }: Props) {
    if (!seat) {
        return ( 
            <div className={`w-10 h-10 rounded-md text-xs font-semibold flex items-center justify-center ${statusClasses.placeholder}`}>
                {seatNumber}
            </div>
        )
    }
    const isLockedByMe = seat.status === 'locked' && seat.lockedByUserId === currentUserId;
    const isClickable = seat.status === 'available' || isLockedByMe || isSelected;
    let effectiveKey: string;
    if (isSelected) effectiveKey = 'selected';
    else if (isLockedByMe) effectiveKey = 'lockedByMe';
    else effectiveKey = seat.status;

    const classes = statusClasses[effectiveKey] ?? statusClasses.sold;

    return (
        <button 
            disabled={!isClickable}
            onClick={() => isClickable && onToggle(seat)}
            title={`Seat ${seat.seatNumber} — ${seat.seatType} —  ₹${(seat.price / 100).toLocaleString('en-IN')}`}
            className={`w-10 h-10 rounded-md text-xs font-semibold flex items-center justify-center transition-all duration-150 select-none relative ${classes}`}
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