export const FONTS = [
  { id: "angelface", name: "Angelface", family: "Angelface", file: "/fonts/angelface.otf", note: "Light & romantic", source: "Your font" },
  { id: "heirloom", name: "Vintage Heirloom", family: "Heirloom", file: "/fonts/heirloom.otf", note: "Handwritten charm", source: "Your font" },
  { id: "great-vibes", name: "Great Vibes", family: "Great Vibes", file: "/fonts/great-vibes.ttf", note: "A graceful flourish", source: "" },
  { id: "allura", name: "Allura", family: "Allura", file: "/fonts/allura.ttf", note: "Soft & effortless", source: "" },
  { id: "cormorant", name: "Cormorant", family: "Cormorant Italic", file: "/fonts/cormorant-italic.ttf", note: "Timeless elegance", source: "" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];
export type Settings = {
  fontId: FontId;
  fontSize: number;
  color: string;
  gap: number;
  margin: number;
  arrangement: "compact" | "grid";
  nameStyle: "single" | "stacked";
  paneWidth: number;
  paneHeight: number;
  paneSpacing: number;
  paneCount: number;
  headingFontId: FontId;
  headingSize: number;
};
export type Table = { id: string; number: string; names: string };
export type Project = { tables: Table[]; settings: Settings };
export const STORAGE_KEY = "ever-after-project-v1";
export const MAX_GUESTS = 1000;
export const DEFAULT_SETTINGS: Settings = {
  fontId: "angelface", fontSize: 44, color: "#24211e", gap: 5,
  margin: 10, arrangement: "compact", nameStyle: "single",
  paneWidth: 25, paneHeight: 35, paneSpacing: 8, paneCount: 7,
  headingFontId: "cormorant", headingSize: 64,
};
export const EXAMPLE_NAMES = [
  "Amelia | van der Merwe", "Oliver | Botha", "Charlotte | de Villiers",
  "James | Williams", "Isabella | du Plessis", "Benjamin | Smith",
  "Sophia | van Wyk", "Ethan | Jacobs", "Emma | Anderson",
  "Noah | Meyer", "Mia | Taylor", "Lucas | Pretorius",
  "Grace | Wilson", "Liam | Coetzee", "Lily | Thompson",
  "Daniel | Smit", "Ella | Brown", "Alexander | Nel",
  "Chloe | Martin", "William | Visser", "Hannah | Clark",
  "Joshua | White", "Ava | Roberts", "Thomas | Steyn",
].join("\n");
export const EXAMPLE_TABLES: Table[] = Array.from({ length: 3 }, (_, index) => ({
  id: `example-${index + 1}`, number: String(index + 1), names: EXAMPLE_NAMES.split("\n").slice(index * 8, index * 8 + 8).join("\n"),
}));

// The couple's seating plan: every new browser starts with these tables.
export const WEDDING_TABLES: Table[] = [
  ["Taylo Vrey", "Theunis Laubsher", "Frans van Kradenburg", "Sonya Fourie", "Werner van Waveren", "Dera Erasmus", "Zaylé van Waveren", "Nathan Nel", "Chris Bruwer", "Kaylin Thiart", "Waldré Meyer", "Christna Meyer"],
  ["Ann Sanders", "Christa Spamers", "Morné Strydom", "Ryan Wiggil", "Bianka Snyman", "Frikkie Snyman", "Kaylem Snyman", "Duné Snyman", "Joey Coetzer", "Cobus Coetzer", "Louis Ries", "Nicolaine Ries"],
  ["Michael Botha", "Anita Botha", "Christa Botha", "Hannes van Aswegen", "Ané Lottering", "Corbin Lottering", "Soul Lottering", "Petri Lottering", "Ryna Botha", "Piet Botha", "Mariska Wiggil", "Charl Venter"],
  ["Roy Strydom", "Cornet Strydom", "Diseri Pearson", "Soné Pearson", "Mia Pearson", "Marné Strydom", "Ruben Smal", "Naomi Roodt", "Willie Roodt", "Bertus van Jaarsveld", "Bianka van Jaarsveld"],
  ["Charlotte Fourie", "Anne Fourie", "Lynette Smith", "Christopher Smith", "Sloane Hessel", "Diané Ludick", "Ziyadh Latib"],
  ["Gert Grobler", "Maria Grobler", "Coria Grobler", "Nico Barkhuizen", "Dewald Esterhuizen", "Nicolene Esterhuizen", "Mike Grimsdel", "Nettie Grimsdel"],
  ["Aubrey Kurten", "Chené Kurten", "Victor Kurten", "Doney Kurten", "Jayden Kurten", "Griffin Bisschoff", "Veronica Bisschoff", "Adrienne Kilian", "Stefan Kilian", "Keeza Kilian"],
].map((names, index) => ({ id: `table-${index + 1}`, number: String(index + 1), names: names.join("\n") }));
// Everyone who receives a seating card, including guests without a table (the couple and the band).
export const WEDDING_GUESTS = [
  "Tiaan Botha", "Hannah Botha", "Taylo Vrey", "Theunis Laubsher", "Frans van Kradenburg", "Sonya Fourie",
  "Dera Erasmus", "Werner van Waveren", "Zaylé van Waveren", "Chris Bruwer", "Kaylin Thiart", "Nathan Nel",
  "Waldré Meyer", "Christna Meyer", "Ann Sanders", "Christa Spamers", "Morné Strydom", "Ryan Wiggil",
  "Bianka Snyman", "Frikkie Snyman", "Kaylem Snyman", "Duné Snyman", "Joey Coetzer", "Cobus Coetzer",
  "Louis Ries", "Nicolaine Ries", "Michael Botha", "Anita Botha", "Christa Botha", "Hannes van Aswegen",
  "Piet Botha", "Ryna Botha", "Ané Lottering", "Corbin Lottering", "Soul Lottering", "Petri Lottering",
  "Mariska Wiggil", "Charl Venter", "Roy Strydom", "Cornet Strydom", "Marné Strydom", "Ruben Smal",
  "Soné Pearson", "Diseri Pearson", "Mia Pearson", "Naomi Roodt", "Willie Roodt", "Bertus van Jaarsveld",
  "Bianka van Jaarsveld", "Charlotte Fourie", "Anne Fourie", "Lynette Smith", "Christopher Smith", "Sloane Hessel",
  "Diané Ludick", "Ziyadh Latib", "Gert Grobler", "Maria Grobler", "Coria Grobler", "Nico Barkhuizen",
  "Dewald Esterhuizen", "Nicolene Esterhuizen", "Mike Grimsdel", "Nettie Grimsdel", "Aubrey Kurten", "Chené Kurten",
  "Victor Kurten", "Doney Kurten", "Jayden Kurten", "Griffin Bisschoff", "Veronica Bisschoff", "Adrienne Kilian",
  "Stefan Kilian", "Keeza Kilian", "QMusic", "Joe West",
].join("\n");

export function parseNames(raw: string): string[] {
  return raw.split(/\r?\n/).map((name) => name.normalize("NFC").trim().replace(/\s+/g, " ")).filter(Boolean);
}

const clamp = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function restoreProject(raw: string | null): Project | null {
  if (!raw) return null;
  try {
    const project = JSON.parse(raw);
    if (!Array.isArray(project.tables) || project.tables.length < 1 || project.tables.length > 60 || !project.settings) return null;
    if (project.tables.some((table: Table) => typeof table.id !== "string" || typeof table.number !== "string" || typeof table.names !== "string" || table.names.length > 200_000)) return null;
    if (new Set(project.tables.map((table: Table) => table.id)).size !== project.tables.length) return null;
    const settings = project.settings;
    // A browser still holding the untouched examples moves to the wedding seating plan.
    const untouched = project.tables.length === EXAMPLE_TABLES.length && project.tables.every((table: Table, index: number) => table.id === EXAMPLE_TABLES[index].id && table.number === EXAMPLE_TABLES[index].number && table.names === EXAMPLE_TABLES[index].names);
    return {
      tables: untouched ? WEDDING_TABLES : project.tables,
      settings: {
        fontId: FONTS.some((font) => font.id === settings.fontId) ? settings.fontId : DEFAULT_SETTINGS.fontId,
        fontSize: clamp(settings.fontSize, DEFAULT_SETTINGS.fontSize, 12, 60),
        color: /^#[a-f\d]{6}$/i.test(settings.color ?? "") ? settings.color : DEFAULT_SETTINGS.color,
        gap: clamp(settings.gap, 5, 2, 12), margin: clamp(settings.margin, 10, 5, 20),
        arrangement: settings.arrangement === "grid" ? "grid" : "compact",
        nameStyle: settings.nameStyle === "stacked" ? "stacked" : "single",
        paneWidth: clamp(settings.paneWidth, 25, 5, 150), paneHeight: clamp(settings.paneHeight, 35, 5, 200),
        paneSpacing: clamp(settings.paneSpacing, 8, 2, 20),
        paneCount: Math.round(clamp(settings.paneCount, 6, 1, 60)),
        headingFontId: FONTS.some((font) => font.id === settings.headingFontId) ? settings.headingFontId : DEFAULT_SETTINGS.headingFontId,
        headingSize: clamp(settings.headingSize, DEFAULT_SETTINGS.headingSize, 16, 100),
      },
    };
  } catch { return null; }
}
