import { type AppRole } from './project-permissions';
export type CustomerPiiFields = {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    address: string | null;
    kycStatus: string | null;
    pan: string | null;
    aadhaar: string | null;
    redacted: boolean;
    reason?: string;
};
export declare function maskPhone(phone: string | null | undefined): string | null;
export declare function maskEmail(email: string | null | undefined): string | null;
export declare function maskPan(pan: string | null | undefined): string | null;
export declare function maskAadhaar(aadhaar: string | null | undefined): string | null;
export declare function projectCustomerPii(customer: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    city?: string | null;
    address?: string | null;
    kycStatus?: string | null;
    pan?: string | null;
    aadhaar?: string | null;
}, ctx: {
    role: unknown;
    ownsRelationship: boolean;
    isSelf: boolean;
}): CustomerPiiFields;
export type { AppRole };
