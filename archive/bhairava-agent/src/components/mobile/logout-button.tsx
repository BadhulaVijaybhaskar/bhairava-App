"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[14px] font-semibold text-destructive hover:bg-[var(--danger-soft)] hover:text-destructive"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut size={16} />
      Logout
    </Button>
  );
}
