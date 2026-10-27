export const FONT_CATEGORIES = [
  { id: "script", name: "Elegant script" },
  { id: "handwritten", name: "Handwritten" },
  { id: "serif", name: "Classic serif" },
  { id: "display", name: "Display" },
  { id: "sans", name: "Clean sans serif" },
] as const;

// Every font must contain printable outlines and the accented letters in the guest list.
// Open fonts come from Google Fonts under the SIL Open Font License (see public/fonts/licenses).
export const FONTS = [
  { id: "angelface", name: "Angelface", file: "/fonts/angelface.otf", category: "script", source: "Your font" },
  { id: "heirloom", name: "Vintage Heirloom", file: "/fonts/heirloom.otf", category: "script", source: "Your font" },
  { id: "great-vibes", name: "Great Vibes", file: "/fonts/great-vibes.ttf", category: "script" },
  { id: "allura", name: "Allura", file: "/fonts/allura.ttf", category: "script" },
  { id: "cormorant", name: "Cormorant Italic", file: "/fonts/cormorant-italic.ttf", category: "serif" },
  { id: "cormorant-garamond", name: "Cormorant Garamond", file: "/fonts/cormorant.ttf", category: "serif" },
  { id: "dm-sans", name: "DM Sans", file: "/fonts/dm-sans.ttf", category: "sans" },
  { id: "alex-brush", name: "Alex Brush", file: "/fonts/alex-brush.ttf", category: "script" },
  { id: "arizonia", name: "Arizonia", file: "/fonts/arizonia.ttf", category: "script" },
  { id: "birthstone", name: "Birthstone", file: "/fonts/birthstone.ttf", category: "script" },
  { id: "bonheur-royale", name: "Bonheur Royale", file: "/fonts/bonheur-royale.ttf", category: "script" },
  { id: "carattere", name: "Carattere", file: "/fonts/carattere.ttf", category: "script" },
  { id: "corinthia", name: "Corinthia", file: "/fonts/corinthia.ttf", category: "script" },
  { id: "dancing-script", name: "Dancing Script", file: "/fonts/dancing-script.ttf", category: "script" },
  { id: "ephesis", name: "Ephesis", file: "/fonts/ephesis.ttf", category: "script" },
  { id: "herr-von-muellerhoff", name: "Herr Von Muellerhoff", file: "/fonts/herr-von-muellerhoff.ttf", category: "script" },
  { id: "imperial-script", name: "Imperial Script", file: "/fonts/imperial-script.ttf", category: "script" },
  { id: "italianno", name: "Italianno", file: "/fonts/italianno.ttf", category: "script" },
  { id: "lavishly-yours", name: "Lavishly Yours", file: "/fonts/lavishly-yours.ttf", category: "script" },
  { id: "luxurious-script", name: "Luxurious Script", file: "/fonts/luxurious-script.ttf", category: "script" },
  { id: "mea-culpa", name: "Mea Culpa", file: "/fonts/mea-culpa.ttf", category: "script" },
  { id: "monsieur-la-doulaise", name: "Monsieur La Doulaise", file: "/fonts/monsieur-la-doulaise.ttf", category: "script" },
  { id: "moon-dance", name: "Moon Dance", file: "/fonts/moon-dance.ttf", category: "script" },
  { id: "mr-de-haviland", name: "Mr De Haviland", file: "/fonts/mr-de-haviland.ttf", category: "script" },
  { id: "mrs-saint-delafield", name: "Mrs Saint Delafield", file: "/fonts/mrs-saint-delafield.ttf", category: "script" },
  { id: "parisienne", name: "Parisienne", file: "/fonts/parisienne.ttf", category: "script" },
  { id: "petit-formal-script", name: "Petit Formal Script", file: "/fonts/petit-formal-script.ttf", category: "script" },
  { id: "pinyon-script", name: "Pinyon Script", file: "/fonts/pinyon-script.ttf", category: "script" },
  { id: "playball", name: "Playball", file: "/fonts/playball.ttf", category: "script" },
  { id: "qwigley", name: "Qwigley", file: "/fonts/qwigley.ttf", category: "script" },
  { id: "rouge-script", name: "Rouge Script", file: "/fonts/rouge-script.ttf", category: "script" },
  { id: "sacramento", name: "Sacramento", file: "/fonts/sacramento.ttf", category: "script" },
  { id: "style-script", name: "Style Script", file: "/fonts/style-script.ttf", category: "script" },
  { id: "tangerine", name: "Tangerine", file: "/fonts/tangerine.ttf", category: "script" },
  { id: "the-nautigal", name: "The Nautigal", file: "/fonts/the-nautigal.ttf", category: "script" },
  { id: "windsong", name: "WindSong", file: "/fonts/windsong.ttf", category: "script" },
  { id: "amatic-sc", name: "Amatic SC", file: "/fonts/amatic-sc.ttf", category: "handwritten" },
  { id: "caveat", name: "Caveat", file: "/fonts/caveat.ttf", category: "handwritten" },
  { id: "cedarville-cursive", name: "Cedarville Cursive", file: "/fonts/cedarville-cursive.ttf", category: "handwritten" },
  { id: "dawning-of-a-new-day", name: "Dawning of a New Day", file: "/fonts/dawning-of-a-new-day.ttf", category: "handwritten" },
  { id: "indie-flower", name: "Indie Flower", file: "/fonts/indie-flower.ttf", category: "handwritten" },
  { id: "kristi", name: "Kristi", file: "/fonts/kristi.ttf", category: "handwritten" },
  { id: "la-belle-aurore", name: "La Belle Aurore", file: "/fonts/la-belle-aurore.ttf", category: "handwritten" },
  { id: "mr-dafoe", name: "Mr Dafoe", file: "/fonts/mr-dafoe.ttf", category: "handwritten" },
  { id: "nothing-you-could-do", name: "Nothing You Could Do", file: "/fonts/nothing-you-could-do.ttf", category: "handwritten" },
  { id: "reenie-beanie", name: "Reenie Beanie", file: "/fonts/reenie-beanie.ttf", category: "handwritten" },
  { id: "shadows-into-light", name: "Shadows Into Light", file: "/fonts/shadows-into-light.ttf", category: "handwritten" },
  { id: "zeyada", name: "Zeyada", file: "/fonts/zeyada.ttf", category: "handwritten" },
  { id: "bellefair", name: "Bellefair", file: "/fonts/bellefair.ttf", category: "serif" },
  { id: "bodoni-moda", name: "Bodoni Moda", file: "/fonts/bodoni-moda.ttf", category: "serif" },
  { id: "bodoni-moda-italic", name: "Bodoni Moda Italic", file: "/fonts/bodoni-moda-italic.ttf", category: "serif" },
  { id: "cinzel", name: "Cinzel", file: "/fonts/cinzel.ttf", category: "serif" },
  { id: "dm-serif-display", name: "DM Serif Display", file: "/fonts/dm-serif-display.ttf", category: "serif" },
  { id: "eb-garamond", name: "EB Garamond", file: "/fonts/eb-garamond.ttf", category: "serif" },
  { id: "eb-garamond-italic", name: "EB Garamond Italic", file: "/fonts/eb-garamond-italic.ttf", category: "serif" },
  { id: "gilda-display", name: "Gilda Display", file: "/fonts/gilda-display.ttf", category: "serif" },
  { id: "libre-baskerville", name: "Libre Baskerville", file: "/fonts/libre-baskerville.ttf", category: "serif" },
  { id: "libre-caslon-display", name: "Libre Caslon Display", file: "/fonts/libre-caslon-display.ttf", category: "serif" },
  { id: "lora", name: "Lora", file: "/fonts/lora.ttf", category: "serif" },
  { id: "lora-italic", name: "Lora Italic", file: "/fonts/lora-italic.ttf", category: "serif" },
  { id: "marcellus", name: "Marcellus", file: "/fonts/marcellus.ttf", category: "serif" },
  { id: "playfair-display", name: "Playfair Display", file: "/fonts/playfair-display.ttf", category: "serif" },
  { id: "playfair-display-italic", name: "Playfair Display Italic", file: "/fonts/playfair-display-italic.ttf", category: "serif" },
  { id: "prata", name: "Prata", file: "/fonts/prata.ttf", category: "serif" },
  { id: "abril-fatface", name: "Abril Fatface", file: "/fonts/abril-fatface.ttf", category: "display" },
  { id: "cinzel-decorative", name: "Cinzel Decorative", file: "/fonts/cinzel-decorative.ttf", category: "display" },
  { id: "forum", name: "Forum", file: "/fonts/forum.ttf", category: "display" },
  { id: "italiana", name: "Italiana", file: "/fonts/italiana.ttf", category: "display" },
  { id: "didact-gothic", name: "Didact Gothic", file: "/fonts/didact-gothic.ttf", category: "sans" },
  { id: "josefin-sans", name: "Josefin Sans", file: "/fonts/josefin-sans.ttf", category: "sans" },
  { id: "jost", name: "Jost", file: "/fonts/jost.ttf", category: "sans" },
  { id: "julius-sans-one", name: "Julius Sans One", file: "/fonts/julius-sans-one.ttf", category: "sans" },
  { id: "montserrat", name: "Montserrat", file: "/fonts/montserrat.ttf", category: "sans" },
  { id: "nunito", name: "Nunito", file: "/fonts/nunito.ttf", category: "sans" },
  { id: "poppins", name: "Poppins", file: "/fonts/poppins.ttf", category: "sans" },
  { id: "questrial", name: "Questrial", file: "/fonts/questrial.ttf", category: "sans" },
  { id: "quicksand", name: "Quicksand", file: "/fonts/quicksand.ttf", category: "sans" },
  { id: "raleway", name: "Raleway", file: "/fonts/raleway.ttf", category: "sans" },
  { id: "tenor-sans", name: "Tenor Sans", file: "/fonts/tenor-sans.ttf", category: "sans" },
  { id: "work-sans", name: "Work Sans", file: "/fonts/work-sans.ttf", category: "sans" },
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
