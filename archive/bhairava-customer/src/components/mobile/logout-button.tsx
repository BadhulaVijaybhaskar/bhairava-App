"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] py-3 text-[14px] font-semibold text-[var(--danger)]"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut size={16} />
      Logout
    </button>
  );
}
