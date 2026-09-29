import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Input } from './Input'

interface Props {
    id: string;
    label: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    locations: string[];
}

export function LocationAutoComplete({ id, label, placeholder, value, onChange, locations } : Props) {
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    const matches = value.trim() ? locations.filter((loc) => loc.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase())).slice(0, 8) : [];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function selectMatch(match: string) {
        onChange(match);
        setOpen(false);
        setHighlighted(-1);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (!open || matches.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlighted((prev) => (prev + 1) % matches.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((prev) => (prev - 1 + matches.length) % matches.length);
        } else if (event.key === 'Enter' && highlighted >= 0) {
            event.preventDefault();
            selectMatch(matches[highlighted]);
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <Input 
                id={id}
                label={label}
                placeholder={placeholder}
                value={value}
                autoComplete="off"
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                    setHighlighted(-1);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
            />
            {open && matches.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {matches.map((match, index) => (
                        <li key={match}>
                            <button
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm ${index === highlighted ? 'bg-brand-50 text-brand-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectMatch(match)}
                            >
                                {match}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}