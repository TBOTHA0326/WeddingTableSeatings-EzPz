import type { Metadata } from "next";
import { SeatingCardStudio } from "@/components/seating-card-studio";

export const metadata: Metadata = { title: "Seating Cards · Ever After", description: "Create fold-over wedding place cards with your guest list and print-ready A4 sheets." };
export default function SeatingCardsPage() { return <SeatingCardStudio />; }
