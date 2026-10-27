import type { Page } from "@playwright/test";
import { DEFAULT_SETTINGS, EXAMPLE_TABLES, STORAGE_KEY } from "../../src/lib/project";
import { CARD_GUESTS_KEY } from "../../src/lib/seating-cards";

// Generic example guests, saved under their own ids (and with a trailing newline on the card
// list) so the move from untouched examples to the wedding plan leaves them alone.
export async function useExampleGuests(page: Page) {
  const project = JSON.stringify({ tables: EXAMPLE_TABLES.map((table, index) => ({ ...table, id: `fixture-${index + 1}` })), settings: DEFAULT_SETTINGS });
  const cards = `${EXAMPLE_TABLES.map((table) => table.names).join("\n")}\n`;
  await page.addInitScript(([projectKey, projectValue, cardKey, cardValue]) => {
    if (localStorage.getItem(projectKey) === null) localStorage.setItem(projectKey, projectValue);
    if (localStorage.getItem(cardKey) === null) localStorage.setItem(cardKey, cardValue);
  }, [STORAGE_KEY, project, CARD_GUESTS_KEY, cards]);
}
