import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { FlashToast } from "@/components/ui/flash-toast";
import { createUser } from "../actions";

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const roles = await prisma.role.findMany({
    where: {
      OR: [{ organizationId: session.orgId }, { organizationId: null }],
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-1 py-1">
        <Link href="/admin/users" className="rounded-lg p-2 text-primary hover:bg-canvas">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>

      {sp.error === "required" ? (
        <FlashToast variant="error" message="Name, email, and password (min 8) are required." />
      ) : null}
      {sp.error === "mobile" ? (
        <FlashToast variant="error" message="Mobile must be 10 digits." />
      ) : null}
      {sp.error === "duplicate" ? (
        <FlashToast variant="error" message="Email or mobile already exists." />
      ) : null}
      {sp.error === "role" ? (
        <FlashToast variant="error" message="Invalid role selected." />
      ) : null}

      <form action={createUser} className="surface space-y-3 p-4 sm:p-5">
        <label className="block text-sm font-semibold text-foreground">
          Full name
          <input name="fullName" required className="input-field mt-1 !pl-3" />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Email
          <input name="email" type="email" required className="input-field mt-1 !pl-3" />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Mobile (optional)
          <input
            name="mobile"
            inputMode="numeric"
            maxLength={10}
            className="input-field mt-1 !pl-3"
          />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Temporary password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="input-field mt-1 !pl-3"
            placeholder="Min 8 characters"
          />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Role
          <select name="roleId" className="input-field mt-1 !pl-3" defaultValue="">
            <option value="">No role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primary px-6 py-2.5">
          Create user
        </button>
      </form>
    </div>
  );
}
