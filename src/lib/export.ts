import JSZip from "jszip";
import { A4, sheetSvg, type Sheet } from "./layout";

export const PNG_DPI = 300;
export const PNG_WIDTH = Math.round(A4.width / 25.4 * PNG_DPI);
export const PNG_HEIGHT = Math.round(A4.height / 25.4 * PNG_DPI);
export type ExportFormat = "svg" | "png";

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// A canvas PNG has no reliable physical size. Write a pHYs chunk for actual-size A4 printing.
export function withPngResolution(bytes: Uint8Array, dpi: number): Uint8Array<ArrayBuffer> {
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4); // pHYs
  const pixelsPerMetre = Math.round(dpi / 0.0254);
  view.setUint32(8, pixelsPerMetre);
  view.setUint32(12, pixelsPerMetre);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const output = new Uint8Array(bytes.length + chunk.length);
  output.set(bytes.subarray(0, 33)); // PNG signature and IHDR
  output.set(chunk, 33);
  output.set(bytes.subarray(33), 54);
  return output;
}

export async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const canvas = document.createElement("canvas");
  canvas.width = PNG_WIDTH;
  canvas.height = PNG_HEIGHT;
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The PNG could not be created. Please try an SVG download."));
      image.src = url;
    });
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not create a PNG. Please download SVG instead.");
    context.drawImage(image, 0, 0, PNG_WIDTH, PNG_HEIGHT);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed. Please try SVG.")), "image/png"));
    const data = withPngResolution(new Uint8Array(await png.arrayBuffer()), PNG_DPI);
    return new Blob([data], { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = 0;
    canvas.height = 0;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exportSheets(pages: Sheet[], color: string, format: ExportFormat, progress: (message: string) => void, pageNumber?: number): Promise<void> {
  if (!pages.length) throw new Error("Add some names before downloading.");
  const zip = pages.length > 1 ? new JSZip() : null;
  for (let index = 0; index < pages.length; index++) {
    progress(`Preparing sheet ${index + 1} of ${pages.length}…`);
    const svg = sheetSvg(pages[index], color);
    const blob = format === "png" ? await svgToPng(svg) : new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const filename = `ever-after-a4-${String(pageNumber ?? index + 1).padStart(2, "0")}.${format}`;
    if (zip) zip.file(filename, await blob.arrayBuffer());
    else downloadBlob(blob, filename);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  if (zip) {
    progress("Wrapping up your sheets…");
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    downloadBlob(blob, `ever-after-${pages.length}-a4-sheets-${format}.zip`);
  }
}
