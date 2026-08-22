"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { KycStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { encryptPii, normalizeAadhaar, normalizePan } from "@/lib/auth/crypto";
import { prisma } from "@/lib/db";

const KYC_STATUSES: KycStatus[] = ["PENDING", "PARTIAL", "VERIFIED", "REJECTED"];

function readCustomerFields(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim().replace(/\s+/g, "");
  const alternateMobile = String(formData.get("alternateMobile") || "").trim().replace(/\s+/g, "");
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const pincode = String(formData.get("pincode") || "").trim();
  const pan = normalizePan(String(formData.get("pan") || ""));
  const aadhaar = normalizeAadhaar(String(formData.get("aadhaar") || ""));
  const kycRaw = String(formData.get("kycStatus") || "PENDING");
  const kycStatus = (KYC_STATUSES.includes(kycRaw as KycStatus) ? kycRaw : "PENDING") as KycStatus;
  const nomineeName = String(formData.get("nomineeName") || "").trim();
  const nomineeRelation = String(formData.get("nomineeRelation") || "").trim();
  const nomineeMobile = String(formData.get("nomineeMobile") || "").trim().replace(/\s+/g, "");
  const supportNotes = String(formData.get("supportNotes") || "").trim();

  return {
    fullName,
    mobile,
    alternateMobile,
    email,
    address,
    city,
    state,
    pincode,
    pan,
    aadhaar,
    kycStatus,
    nomineeName,
    nomineeRelation,
    nomineeMobile,
    supportNotes,
  };
}

function validateCore(fields: ReturnType<typeof readCustomerFields>, basePath: string) {
  if (
    !fields.fullName ||
    !fields.mobile ||
    !fields.email ||
    !fields.address ||
    !fields.city ||
    !fields.state ||
    !fields.pincode
  ) {
    redirect(`${basePath}?error=required`);
  }
  if (!/^\d{10}$/.test(fields.mobile)) {
    redirect(`${basePath}?error=mobile`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    redirect(`${basePath}?error=email`);
  }
  if (fields.alternateMobile && !/^\d{10}$/.test(fields.alternateMobile)) {
    redirect(`${basePath}?error=altmobile`);
  }
  if (fields.nomineeMobile && !/^\d{10}$/.test(fields.nomineeMobile)) {
    redirect(`${basePath}?error=nomineemobile`);
  }
  if (fields.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(fields.pan)) {
    redirect(`${basePath}?error=pan`);
  }
  if (fields.aadhaar && !/^\d{12}$/.test(fields.aadhaar)) {
    redirect(`${basePath}?error=aadhaar`);
  }
  if (!/^\d{6}$/.test(fields.pincode)) {
    redirect(`${basePath}?error=pincode`);
  }
}

function piiPatch(pan: string, aadhaar: string) {
  const data: {
    panEncrypted?: string;
    panLast4?: string;
    aadhaarEncrypted?: string;
    aadhaarLast4?: string;
  } = {};

  if (pan) {
    data.panEncrypted = encryptPii(pan);
    data.panLast4 = pan.slice(-4);
  }
  if (aadhaar) {
    data.aadhaarEncrypted = encryptPii(aadhaar);
    data.aadhaarLast4 = aadhaar.slice(-4);
  }
  return data;
}

export async function createCustomer(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const fields = readCustomerFields(formData);
  validateCore(fields, "/admin/customers/new");

  const existing = await prisma.customer.findFirst({
    where: { organizationId: session.orgId, mobile: fields.mobile, deletedAt: null },
  });
  if (existing) redirect("/admin/customers/new?error=duplicate");

  const customer = await prisma.customer.create({
    data: {
      organizationId: session.orgId,
      fullName: fields.fullName,
      mobile: fields.mobile,
      alternateMobile: fields.alternateMobile || null,
      email: fields.email || null,
      address: fields.address || null,
      city: fields.city || null,
      state: fields.state || null,
      pincode: fields.pincode || null,
      kycStatus: fields.kycStatus,
      nomineeName: fields.nomineeName || null,
      nomineeRelation: fields.nomineeRelation || null,
      nomineeMobile: fields.nomineeMobile || null,
      supportNotes: fields.supportNotes || null,
      createdBy: session.sub,
      updatedBy: session.sub,
      ...piiPatch(fields.pan, fields.aadhaar),
    },
  });

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}?saved=1`);
}

export async function updateCustomer(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  const fields = readCustomerFields(formData);
  if (!id) redirect("/admin/customers");
  validateCore(fields, `/admin/customers/${id}/edit`);

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!customer) redirect("/admin/customers");

  const duplicate = await prisma.customer.findFirst({
    where: {
      organizationId: session.orgId,
      mobile: fields.mobile,
      deletedAt: null,
      NOT: { id },
    },
  });
  if (duplicate) redirect(`/admin/customers/${id}/edit?error=duplicate`);

  await prisma.customer.update({
    where: { id },
    data: {
      fullName: fields.fullName,
      mobile: fields.mobile,
      alternateMobile: fields.alternateMobile || null,
      email: fields.email || null,
      address: fields.address || null,
      city: fields.city || null,
      state: fields.state || null,
      pincode: fields.pincode || null,
      kycStatus: fields.kycStatus,
      nomineeName: fields.nomineeName || null,
      nomineeRelation: fields.nomineeRelation || null,
      nomineeMobile: fields.nomineeMobile || null,
      supportNotes: fields.supportNotes || null,
      updatedBy: session.sub,
      ...piiPatch(fields.pan, fields.aadhaar),
    },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath(`/admin/customers/${id}/edit`);
  redirect(`/admin/customers/${id}?saved=1`);
}

type FollowUpRow = { id: string; at: string; note?: string };

function parseFollowUps(raw: unknown): FollowUpRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: FollowUpRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = String(o.id || "");
    const at = String(o.at || "");
    if (!id || !at || Number.isNaN(Date.parse(at))) continue;
    const note = o.note != null ? String(o.note) : undefined;
    rows.push({ id, at, note });
  }
  return rows;
}

export async function scheduleCustomerFollowUp(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const customerId = String(formData.get("customerId") || "");
  const date = String(formData.get("date") || "").trim(); // YYYY-MM-DD
  const hour = Number(formData.get("hour") || 0);
  const minute = Number(formData.get("minute") || 0);
  const ampm = String(formData.get("ampm") || "AM").toUpperCase();
  const note = String(formData.get("note") || "").trim();

  if (!customerId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect(`/admin/customers/${customerId || ""}?followError=1`);
  }
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) {
    redirect(`/admin/customers/${customerId}?followError=time`);
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    redirect(`/admin/customers/${customerId}?followError=time`);
  }
  if (ampm !== "AM" && ampm !== "PM") {
    redirect(`/admin/customers/${customerId}?followError=time`);
  }

  let h24 = hour % 12;
  if (ampm === "PM") h24 += 12;

  const at = new Date(`${date}T${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
  if (Number.isNaN(at.getTime())) {
    redirect(`/admin/customers/${customerId}?followError=1`);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: session.orgId, deletedAt: null },
    select: { id: true, fullName: true, followUps: true },
  });
  if (!customer) redirect("/admin/customers");

  const existing = parseFollowUps(customer.followUps);
  const next: FollowUpRow[] = [
    ...existing,
    {
      id: crypto.randomUUID(),
      at: at.toISOString(),
      ...(note ? { note } : {}),
    },
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  await prisma.customer.update({
    where: { id: customerId },
    data: { followUps: next, updatedBy: session.sub },
  });

  const when = at.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  await prisma.notification.create({
    data: {
      organizationId: session.orgId,
      userId: session.sub,
      type: "SUCCESS",
      title: "Follow-up scheduled",
      body: note
        ? `${customer.fullName} · ${when} — ${note}`
        : `${customer.fullName} · ${when}`,
      linkUrl: `/admin/customers/${customerId}`,
    },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/notifications");
  redirect(`/admin/customers/${customerId}?followSaved=1`);
}

export async function deleteCustomerFollowUp(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const customerId = String(formData.get("customerId") || "");
  const followUpId = String(formData.get("followUpId") || "");
  if (!customerId || !followUpId) redirect("/admin/customers");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: session.orgId, deletedAt: null },
    select: { id: true, followUps: true },
  });
  if (!customer) redirect("/admin/customers");

  const next = parseFollowUps(customer.followUps).filter((f) => f.id !== followUpId);
  await prisma.customer.update({
    where: { id: customerId },
    data: { followUps: next, updatedBy: session.sub },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}`);
}

function parseChecklist(raw: unknown): { id: string; title: string }[] {
  if (!Array.isArray(raw)) {
    return [
      { id: "booking-form", title: "Booking Form" },
      { id: "id-proof", title: "ID Proof" },
      { id: "address-proof", title: "Address Proof" },
    ];
  }
  const items = raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const id = String(o.id || "").trim();
      const title = String(o.title || "").trim();
      if (!id || !title) return null;
      return { id, title };
    })
    .filter((x): x is { id: string; title: string } => x != null);
  return items.length
    ? items
    : [
        { id: "booking-form", title: "Booking Form" },
        { id: "id-proof", title: "ID Proof" },
        { id: "address-proof", title: "Address Proof" },
      ];
}

export async function addCustomerDocumentSection(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const customerId = String(formData.get("customerId") || "");
  const title = String(formData.get("title") || "").trim();
  if (!customerId || !title) redirect(`/admin/customers/${customerId || ""}`);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: session.orgId, deletedAt: null },
    select: { id: true, documentChecklist: true },
  });
  if (!customer) redirect("/admin/customers");

  const list = parseChecklist(customer.documentChecklist);
  if (list.some((i) => i.title.toLowerCase() === title.toLowerCase())) {
    redirect(`/admin/customers/${customerId}`);
  }
  list.push({ id: crypto.randomUUID(), title });

  await prisma.customer.update({
    where: { id: customerId },
    data: { documentChecklist: list, updatedBy: session.sub },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}`);
}

export async function removeCustomerDocumentSection(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const customerId = String(formData.get("customerId") || "");
  const sectionId = String(formData.get("sectionId") || "");
  if (!customerId || !sectionId) redirect("/admin/customers");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: session.orgId, deletedAt: null },
    select: { id: true, documentChecklist: true },
  });
  if (!customer) redirect("/admin/customers");

  const list = parseChecklist(customer.documentChecklist).filter((i) => i.id !== sectionId);
  await prisma.customer.update({
    where: { id: customerId },
    data: { documentChecklist: list, updatedBy: session.sub },
  });

  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}`);
}
