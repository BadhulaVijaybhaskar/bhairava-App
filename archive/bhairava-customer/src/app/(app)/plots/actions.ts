"use server";

import { expressInterest } from "@/app/(app)/browse/actions";
import { redirect } from "next/navigation";

export async function registerInterestForm(formData: FormData) {
  const plotId = String(formData.get("plotId") || "");
  const res = await expressInterest(plotId);
  if (!res.ok) {
    redirect(`/plots/${plotId}?error=interest`);
  }
  redirect(`/plots/${plotId}?interested=1`);
}
