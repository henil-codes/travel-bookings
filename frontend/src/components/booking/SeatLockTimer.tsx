import { useEffect, useState, useCallback } from 'react';

interface Props {
  lockedUntil: string;
  onExpire: () => void;
}

export function SeatLockTimer({ lockedUntil, onExpire }: Props) {
  const getSecondsLeft = useCallback(() => {
    return Math.max(
      0,
      Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000)
    );
  }, [lockedUntil]);

  const [seconds, setSeconds] = useState(getSecondsLeft);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire;
      return;
    }
    const id = setInterval(() => {
      const newSeconds = getSecondsLeft();
      setSeconds(newSeconds);
      if (newSeconds <= 0) {
        clearInterval(id);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [getSecondsLeft, onExpire, seconds]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const isUrgent = seconds <= 60;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isUrgent ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Seat held for {minutes}:{remainingSeconds.toString().padStart(2, '0')}
      {isUrgent && ' — complete payment soon!'}
    </div>
  );
}
