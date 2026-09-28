"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskPhone = maskPhone;
exports.maskEmail = maskEmail;
exports.maskPan = maskPan;
exports.maskAadhaar = maskAadhaar;
exports.projectCustomerPii = projectCustomerPii;
const project_permissions_1 = require("./project-permissions");
function maskPhone(phone) {
    if (!phone)
        return null;
    const d = phone.replace(/\D/g, '');
    if (d.length < 4)
        return '****';
    return '*'.repeat(Math.max(0, d.length - 4)) + d.slice(-4);
}
function maskEmail(email) {
    if (!email || !email.includes('@'))
        return null;
    const [u, domain] = email.split('@');
    return u.slice(0, 1) + '***@' + domain;
}
function maskPan(pan) {
    if (!pan)
        return null;
    if (pan.length < 4)
        return '****';
    return pan.slice(0, 2) + '****' + pan.slice(-2);
}
function maskAadhaar(aadhaar) {
    if (!aadhaar)
        return null;
    const d = aadhaar.replace(/\D/g, '');
    if (d.length < 4)
        return '****';
    return 'XXXX-XXXX-' + d.slice(-4);
}
function projectCustomerPii(customer, ctx) {
    const role = (0, project_permissions_1.normalizeRole)(ctx.role);
    const full = () => ({
        id: customer.id,
        name: customer.name ?? null,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        city: customer.city ?? null,
        address: customer.address ?? null,
        kycStatus: customer.kycStatus ?? null,
        pan: customer.pan ?? null,
        aadhaar: customer.aadhaar ?? null,
        redacted: false,
    });
    if (role === 'Founder' || role === 'Administrator')
        return full();
    if (role === 'Finance') {
        return { ...full(), aadhaar: maskAadhaar(customer.aadhaar), pan: maskPan(customer.pan) };
    }
    if (role === 'Viewer') {
        return {
            id: customer.id, name: customer.name ?? null, phone: maskPhone(customer.phone),
            email: maskEmail(customer.email), city: customer.city ?? null, address: null,
            kycStatus: customer.kycStatus ?? null, pan: null, aadhaar: null,
            redacted: true, reason: 'Viewer limited PII',
        };
    }
    if (role === 'Agent' || role === 'Sales') {
        if (!ctx.ownsRelationship) {
            return {
                id: customer.id, name: null, phone: null, email: null, city: null, address: null,
                kycStatus: null, pan: null, aadhaar: null, redacted: true,
                reason: 'Agent may not view unrelated customer PII',
            };
        }
        return { ...full(), pan: maskPan(customer.pan), aadhaar: maskAadhaar(customer.aadhaar) };
    }
    if (role === 'Customer') {
        if (!ctx.isSelf) {
            return {
                id: customer.id, name: null, phone: null, email: null, city: null, address: null,
                kycStatus: null, pan: null, aadhaar: null, redacted: true, reason: 'Customer may only view self',
            };
        }
        return full();
    }
    return {
        id: customer.id, name: null, phone: null, email: null, city: null, address: null,
        kycStatus: null, pan: null, aadhaar: null, redacted: true, reason: 'No PII access',
    };
}
//# sourceMappingURL=pii.js.map