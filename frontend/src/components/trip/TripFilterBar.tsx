import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { LocationAutoComplete } from '../ui/LocationAutoComplete';
import { useLocations } from '../../hooks/useLocations';
import type { TripFilter } from '../../types/trip';

interface Props {
  onFilter: (filters: TripFilter) => void;
  initial?: { from?: string; to?: string; date?: string };
}

export function TripFilterBar({ onFilter, initial }: Props) {
  const [from, setFrom] = useState(initial?.from ?? '');
  const [to, setTo] = useState(initial?.to ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const { data: locations } = useLocations();

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
        <LocationAutoComplete
          id="from"
          label="From"
          placeholder="Mumbai"
          value={from}
          onChange={setFrom}
          locations={locations ?? []}
        />
        <LocationAutoComplete
          id="to"
          label="To"
          placeholder="Pune"
          value={to}
          onChange={setTo}
          locations={locations ?? []}
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
