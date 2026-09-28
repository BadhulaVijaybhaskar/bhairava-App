"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_VISIBILITIES = void 0;
exports.isDocumentVisibility = isDocumentVisibility;
exports.DOCUMENT_VISIBILITIES = [
    'INTERNAL',
    'AGENT_VISIBLE',
    'CUSTOMER_PROFILE_RELATED',
];
function isDocumentVisibility(v) {
    return typeof v === 'string' && exports.DOCUMENT_VISIBILITIES.includes(v);
}
//# sourceMappingURL=document-visibility.js.map