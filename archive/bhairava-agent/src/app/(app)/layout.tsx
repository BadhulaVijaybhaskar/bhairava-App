import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AgentShell } from "@/components/agent-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AgentShell name={session.name}>{children}</AgentShell>;
}
