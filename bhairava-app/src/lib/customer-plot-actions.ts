import type { PlotStatus } from "@prisma/client";

export type CustomerPlotCapability = {
  canView: boolean;
  canExpressInterest: boolean;
  canRequestBooking: boolean;
  canJoinWaitlist: boolean;
  canMakeOffer: boolean;
  visibleInApp: boolean;
  summary: string;
  actions: string[];
};

/** Exact customer actions by plot availability (shown on plot details) */
export const CUSTOMER_ACTIONS_BY_STATUS: Record<PlotStatus, CustomerPlotCapability> = {
  AVAILABLE: {
    canView: true,
    canExpressInterest: true,
    canRequestBooking: true,
    canJoinWaitlist: false,
    canMakeOffer: false,
    visibleInApp: true,
    summary: "Open for purchase — customer can enquire and request booking.",
    actions: [
      "View plot details & price",
      "Express interest (notifies sales)",
      "Request booking / reserve",
    ],
  },
  RESERVED: {
    canView: true,
    canExpressInterest: true,
    canRequestBooking: false,
    canJoinWaitlist: true,
    canMakeOffer: false,
    visibleInApp: true,
    summary: "Temporarily held — customer can join waitlist if it frees up.",
    actions: [
      "View limited plot details",
      "Join waitlist / notify me",
      "Express interest (notifies sales)",
    ],
  },
  BOOKED: {
    canView: true,
    canExpressInterest: false,
    canRequestBooking: false,
    canJoinWaitlist: true,
    canMakeOffer: false,
    visibleInApp: true,
    summary: "Already booked — other customers can only view / waitlist.",
    actions: [
      "View that plot is booked",
      "Join waitlist if booking cancels",
      "Browse other available plots",
    ],
  },
  UNDER_DOCUMENTATION: {
    canView: true,
    canExpressInterest: false,
    canRequestBooking: false,
    canJoinWaitlist: false,
    canMakeOffer: false,
    visibleInApp: true,
    summary: "Sale in progress — documentation underway.",
    actions: [
      "View status as under documentation",
      "Browse other available plots",
      "Cannot enquire to buy this plot",
    ],
  },
  SOLD: {
    canView: true,
    canExpressInterest: false,
    canRequestBooking: false,
    canJoinWaitlist: false,
    canMakeOffer: false,
    visibleInApp: true,
    summary: "Sold — view only for other customers.",
    actions: [
      "View as sold",
      "Browse other available / resale plots",
      "Cannot purchase",
    ],
  },
  REGISTERED: {
    canView: true,
    canExpressInterest: false,
    canRequestBooking: false,
    canJoinWaitlist: false,
    canMakeOffer: false,
    visibleInApp: true,
    summary: "Registered to owner — view only.",
    actions: [
      "View as registered",
      "Browse other plots",
      "Cannot purchase",
    ],
  },
  RESALE_AVAILABLE: {
    canView: true,
    canExpressInterest: true,
    canRequestBooking: true,
    canJoinWaitlist: false,
    canMakeOffer: true,
    visibleInApp: true,
    summary: "Back on market for resale — customer can enquire or offer.",
    actions: [
      "View resale plot details & price",
      "Express interest (notifies sales)",
      "Submit an offer",
    ],
  },
  BLOCKED: {
    canView: false,
    canExpressInterest: false,
    canRequestBooking: false,
    canJoinWaitlist: false,
    canMakeOffer: false,
    visibleInApp: false,
    summary: "Blocked / held by company — hidden or unavailable in customer app.",
    actions: [
      "Not shown as buyable",
      "No enquiry or booking",
    ],
  },
  CANCELLED: {
    canView: false,
    canExpressInterest: false,
    canRequestBooking: false,
    canJoinWaitlist: false,
    canMakeOffer: false,
    visibleInApp: false,
    summary: "Cancelled inventory — not offered to customers.",
    actions: [
      "Not shown in customer app",
      "No actions available",
    ],
  },
};
