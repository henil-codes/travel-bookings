import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { TripFilter } from '../../types/trip';

interface Props {
  onFilter: (filters: TripFilter) => void;
}

export function TripFilterBar({ onFilter }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onFilter({
      startLocation: from || undefined,
      endLocation: to || undefined,
      date: date || undefined,
      status: 'scheduled',
    });
  }

  function handleClear() {
    setFrom('');
    setTo('');
    setDate('');
    onFilter({ status: 'scheduled' });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          id="from"
          label="From"
          placeholder="Mumbai"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          id="to"
          label="To"
          placeholder="Pune"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Input
          id="date"
          type="date"
          label="Date"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button type="submit" size="sm">
          Search trips
        </Button>
      </div>
    </form>
  );
}
