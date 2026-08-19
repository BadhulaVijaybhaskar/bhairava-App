import { getSession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  return jsonOk({
    id: session.sub,
    fullName: session.name,
    email: session.email,
    mobile: session.mobile,
    roles: session.roles,
    agentId: session.agentId,
    organizationId: session.orgId,
  });
}
