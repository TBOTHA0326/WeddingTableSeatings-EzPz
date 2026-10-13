# Ever After · Wedding Name Studio

A warm, simple wedding seating designer built with Next.js, React, TypeScript, and Tailwind CSS. Designed for sticking DTF name transfers onto a wooden door’s glass panes, with one table per pane.

## Run locally

Use Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Your seating window

- Add tables and enter one guest per line. Each populated table gets its own glass pane.
- Enter the visible width and height of one pane in centimetres, and the total number of panes. These dimensions apply to every pane.
- Choose guest lettering and a separate table-heading font and size. Every guest name uses the same point size; individual names are never automatically shrunk.
- Use `First name | Compound surname` to specify a line break when using the two-line style. Plain full names work too; two-line mode splits those at the last space.
- Adjust guest spacing on the glass separately from cutting gaps and page margins on the A4 sheets.
- The app checks available panes, physical fit, unsupported font characters, and duplicate table numbers before enabling downloads. It reserves 1.5 cm of clear space around the glass lettering.
- Switch between the glass preview and A4 sheets. The door is an illustration of the pane arrangement; all fit and print calculations use the entered physical measurements. For more than 12 panes, the illustration shows the first 12, while calculations include every pane.

The sample contains three tables with eight guests each. Replace these with your guest list. Names and settings save automatically in this browser’s local storage. No account, database, or server upload is involved. Up to 60 tables and 1,000 guests are supported.

## Fold-over seating cards

Open **Seating cards** in the studio navigation, or visit `/seating-cards`. The page shares your existing guest tables and prints one fold-over card per guest. Names and compound surnames appear together on one line in the lower-right area of the bottom panel; the upper panel stays blank.

The cards embed `public/ActualCardArtwork.jpeg` exactly as supplied, including both panels, border, florals, and centre strip. The original artwork's 787 × 1150 proportions remain fixed. The default width is 90 mm (standing face approximately 90 × 65.8 mm), fitting four complete cards per A4 sheet. Adjust the width to suit your cardstock.

Vintage Heirloom is the starting font, as a similar style rather than a confirmed match to `public/FontAndPlacementReference.jpeg`. **Import exact font** accepts TTF, OTF, WOFF, or WOFF2 files up to 2 MB. Imported fonts are parsed locally and saved in this browser's IndexedDB; they are not uploaded or bundled into the app. Missing font characters block downloads. Long names automatically scale to fit the reference's name area, including their flourishes.

Download all tables or a selected table as A4 SVGs with embedded artwork and outlined lettering, or opaque 300-DPI PNGs. Multiple pages are packaged in a ZIP. Preview the complete card, its standing front face, or A4 sheets; download a current sheet individually. Optional cut and fold guides are included in the export when enabled. **Print / Save as PDF** opens the browser's print dialog with A4 pages. Print at actual size / 100%, disable headers and footers, then cut each complete card and fold through its centre.

## Name lettering downloads

**SVG** is the recommended printer file. It is exactly 210 × 297 mm with an A4 viewBox, transparent background, and all lettering converted to vector paths using Fontkit. It has no embedded fonts or external resources.

**PNG** exports at 300 DPI, 2480 × 3508 px, with an alpha channel. A `pHYs` chunk records print resolution. Transparent pixels remain transparent, including when printing white lettering.

One sheet downloads directly; multiple sheets download as a ZIP containing numbered A4 files. The current sheet can also be downloaded individually from the A4 preview toolbar.

Smart packing measures the real glyph outlines, including flourishes, and uses rectangle packing without rotating labels. It chooses the arrangement with fewer sheets between its compact layout and the equal-column grid. The A4 layout packs separate stickers; arrange those stickers on the glass using the pane preview. Glass frames, preview backgrounds, measuring lines, and cutting guides are never included in exports. Ask your printer for actual size / 100% scale. Mirroring is left to the printer’s transfer process.

## Fonts

Angelface and Vintage Heirloom were copied from your supplied Downloads files. Great Vibes, Allura, Cormorant Garamond, and the DM Sans interface font are bundled locally from Google Fonts. See [font notices](public/fonts/licenses/NOTICES.md) for source and license details. The app makes no external font requests.

## Verify

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser tests use installed Google Chrome. To use Playwright’s Chromium instead, remove `channel: "chrome"` from `playwright.config.ts` and run `npx playwright install chromium`.

Tests check A4 bounds and overlap, all five printing fonts, uniform name sizes, separate heading sizes, physical pane fit, persisted settings, SVG outlines, PNG transparency and resolution, pane capacity, and mobile layouts.

## Deploy on Vercel

Import this repository into Vercel and choose the **Next.js** preset. Keep the root directory at the repository root. The defaults are `npm install` and `npm run build`. No environment variables or database are required.

Alternatively, from this directory:

```sh
npx vercel
```

The app is prepared for deployment; building the repo does not itself publish a site.
