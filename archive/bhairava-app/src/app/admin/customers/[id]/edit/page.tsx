import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateCustomer } from "../../actions";
import { CustomerForm } from "../../customer-form";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <CustomerForm
        action={updateCustomer}
        error={sp.error}
        saved={sp.saved === "1"}
        submitLabel="Save customer"
        backHref={`/admin/customers/${customer.id}`}
        defaults={{
          id: customer.id,
          fullName: customer.fullName,
          mobile: customer.mobile,
          alternateMobile: customer.alternateMobile,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
          panLast4: customer.panLast4,
          aadhaarLast4: customer.aadhaarLast4,
          kycStatus: customer.kycStatus,
          nomineeName: customer.nomineeName,
          nomineeRelation: customer.nomineeRelation,
          nomineeMobile: customer.nomineeMobile,
          supportNotes: customer.supportNotes,
        }}
      />
    </div>
  );
}
