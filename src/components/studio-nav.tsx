import Link from "next/link";
import { DoorOpen, FileImage, RectangleHorizontal } from "lucide-react";

export function StudioNav({ active }: { active: "window" | "pages" | "cards" }) {
  return <nav className="studio-nav" aria-label="Wedding studios">
    <Link href="/" aria-current={active === "window" ? "page" : undefined}><DoorOpen size={15} />Seating window</Link>
    <Link href="/table-pages" aria-current={active === "pages" ? "page" : undefined}><FileImage size={15} />Table pages</Link>
    <Link href="/seating-cards" aria-current={active === "cards" ? "page" : undefined}><RectangleHorizontal size={15} />Seating cards</Link>
  </nav>;
}
