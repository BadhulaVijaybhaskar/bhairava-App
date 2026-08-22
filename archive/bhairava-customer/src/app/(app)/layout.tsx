import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CustomerShell } from "@/components/customer-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <CustomerShell name={session.name}>{children}</CustomerShell>;
}
