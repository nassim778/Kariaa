import Image from "next/image";
import { BRAND } from "@/lib/brand";

interface Props {
  size?: number;
  className?: string;
}

export default function BrandLogo({ size = 44, className = "" }: Props) {
  return (
    <Image
      src={BRAND.logo}
      alt="كرية"
      width={size}
      height={size}
      className={`shrink-0 rounded-xl object-cover ${className}`}
      priority
    />
  );
}
