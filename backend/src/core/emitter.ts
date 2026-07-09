import { EventEmitter } from 'events';

export const appEmitter = new EventEmitter();

// Type event map from auto complete and type safety
export interface AppEvents {
    'seat:status_changed' : {
        seatId: string,
        tripId: string,
        status: string,
        lockedUntil: Date | null;
        lockedByUserId: string | null;
    };
}

export function emitEvent<K extends keyof AppEvents> (
    eventName: K,
    payload: AppEvents[K]
) {
    appEmitter.emit(eventName, payload);
}