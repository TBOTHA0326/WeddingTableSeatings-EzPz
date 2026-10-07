import { create, type Font } from "fontkit";

export function parseFont(data: Uint8Array): Font {
  const font = create(data as Buffer);
  if (!("layout" in font)) throw new Error("Font collections are not supported.");
  return font.variationAxes.wght ? font.getVariation({ wght: 400 }) : font;
}
