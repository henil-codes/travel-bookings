export type Role = 'customer' | 'manager' | 'driver' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'deactivated';
export type AuthProvider = 'local' | 'google';

export interface User {
    id: string;
    name: string;
    email: string;
    countryCode: string | null;
    localPhone: string | null;
    role: Role;
    accountStatus: AccountStatus;
    authProvider: AuthProvider;
    googleId: string | null;
    createdAt: string;
    updatedAt: string;
    suspendedAt: string | null;
}