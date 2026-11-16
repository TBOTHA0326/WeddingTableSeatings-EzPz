import type { Metadata } from "next";
import { StickerStudio } from "@/components/sticker-studio";

export const metadata: Metadata = { title: "Vinyl Stickers · Ever After", description: "Size words in centimetres, preview them on the door, and download cut-ready vinyl sticker files." };
export default function VinylStickersPage() { return <StickerStudio />; }
