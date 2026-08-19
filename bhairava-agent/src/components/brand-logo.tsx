import Image from "next/image";

export function BrandLogo({ size = 72 }: { size?: number }) {
  return (
    <div className="flex justify-center">
      <Image
        src="/branding/bhairava-logo.png"
        alt="Bhairava Real Estate"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  );
}
