import { BrandLogo } from "@/components/brand-logo";

/** Route loading — spinning logo only (no brand name) */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white">
      <BrandLogo size={110} spin />
    </div>
  );
}
