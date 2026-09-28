"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rupeesToPaise = rupeesToPaise;
exports.paiseToRupees = paiseToRupees;
exports.addPaise = addPaise;
exports.assertNonNegativePaise = assertNonNegativePaise;
function rupeesToPaise(rupees) {
    if (!Number.isFinite(rupees))
        throw new Error('Invalid rupees');
    return Math.round(rupees * 100);
}
function paiseToRupees(paise) {
    if (!Number.isInteger(paise))
        throw new Error('Paise must be integer');
    return paise / 100;
}
function addPaise(...parts) {
    return parts.reduce((s, p) => {
        if (!Number.isInteger(p))
            throw new Error('Paise must be integer');
        return s + p;
    }, 0);
}
function assertNonNegativePaise(paise, label = 'amount') {
    if (!Number.isInteger(paise) || paise < 0)
        throw new Error(label + ' must be non-negative integer paise');
}
//# sourceMappingURL=money.js.map