import { type VehicleAmenity } from '../../types/vehicle';

export const AMENITY_OPTIONS: { value: VehicleAmenity; label: string; icon: string }[] = [
    { value: 'ac', label: 'AC', icon: '❄️' },
    { value: 'charging_point', label: 'Charging point', icon: '🔌' },
    { value: 'wifi', label: 'WiFi', icon: '📶' },
    { value: 'reclining_seats', label: 'Reclining seats', icon: '💺' },
    { value: 'blanket', label: 'Blanket', icon: '🧣' },
    { value: 'entertainment_system', label: 'Entertainment screen', icon: '📺' },
    { value: 'washroom', label: 'Washroom', icon: '🚻' },
]

export const AMENITY_LABEL = Object.fromEntries(AMENITY_OPTIONS.map((option) => [option.value, option.label])) as Record<VehicleAmenity, string>;
export const AMENITY_ICON = Object.fromEntries(AMENITY_OPTIONS.map((option) => [option.value, option.icon])) as Record<VehicleAmenity, string>;