import { jsonError, jsonOk } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      status: true,
      organizationId: true,
      organization: { select: { name: true, code: true } },
    },
  });

  if (!user) return jsonError("Unauthorized", 401);

  return jsonOk({ ...user, roles: session.roles });
}
