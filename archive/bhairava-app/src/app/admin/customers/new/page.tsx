import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <CustomerForm
        action={createCustomer}
        error={sp.error}
        submitLabel="Create customer"
        backHref="/admin/customers"
      />
    </div>
  );
}
