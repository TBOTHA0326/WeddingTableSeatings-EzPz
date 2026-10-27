import type { Metadata } from "next";
import { TablePageStudio } from "@/components/table-page-studio";

export const metadata: Metadata = { title: "Table Pages · Ever After", description: "Print one framed page per table, with the table number and every guest’s name." };
export default function TablePagesPage() { return <TablePageStudio />; }
