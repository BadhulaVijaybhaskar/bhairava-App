import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createCustomer } from "../actions";
import { MobileHeader } from "@/components/mobile/mobile-header";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  return (
    <div>
      <MobileHeader title="Add Customer" backHref="/customers" showBell={false} />

      {sp.error === "required" ? (
        <p className="mb-2 text-[12px] text-[var(--danger)]">Name and mobile are required.</p>
      ) : null}
      {sp.error === "duplicate" ? (
        <p className="mb-2 text-[12px] text-[var(--danger)]">Mobile already exists.</p>
      ) : null}

      <form action={createCustomer} className="m-card space-y-3 p-4">
        <label className="block text-[12px] font-semibold text-muted-foreground">
          Customer Name
          <input name="fullName" required className="m-input mt-1 !pl-3" />
        </label>
        <label className="block text-[12px] font-semibold text-muted-foreground">
          Mobile Number
          <input name="mobile" required type="tel" inputMode="tel" className="m-input mt-1 !pl-3" />
        </label>
        <label className="block text-[12px] font-semibold text-muted-foreground">
          Email
          <input name="email" type="email" className="m-input mt-1 !pl-3" />
        </label>
        <label className="block text-[12px] font-semibold text-muted-foreground">
          City
          <input name="city" className="m-input mt-1 !pl-3" />
        </label>
        <button type="submit" className="m-btn">
          Save Customer
        </button>
      </form>
    </div>
  );
}
