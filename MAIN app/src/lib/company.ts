export interface CompanySettings {
  companyName: string;
  registeredOffice: string;
  gstin: string;
  rera: string;
  primaryColor: string;
  supportEmail: string;
  reservationValidityDays: number;
  gstRate: number;
  defaultBookingToken: number;
  notifyNewBooking: boolean;
  notifyReservationExpiry: boolean;
  notifyPaymentFailure: boolean;
  notifyWeeklyDigest: boolean;
}

export const defaultCompanySettings = (): CompanySettings => ({
  companyName: "Astranova Bhairava Developers",
  registeredOffice: "Hyderabad, Telangana",
  gstin: "36AACFB1234C1Z5",
  rera: "P02400012345",
  primaryColor: "#2F6B4F",
  supportEmail: "support@bhairava.in",
  reservationValidityDays: 7,
  gstRate: 5,
  defaultBookingToken: 100000,
  notifyNewBooking: true,
  notifyReservationExpiry: true,
  notifyPaymentFailure: true,
  notifyWeeklyDigest: false,
});
