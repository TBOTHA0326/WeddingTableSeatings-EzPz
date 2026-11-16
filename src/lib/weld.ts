import paper from "paper/dist/paper-core";

paper.setup(new paper.Size(1, 1));
paper.settings.insertItems = false;

export type Outline = { d: string; x: number; y: number };
// Part of Paper's API, but missing from its published types.
type Resolvable = paper.PathItem & { resolveCrossings(): Resolvable; reorient(nonZero: boolean, clockwise: boolean): paper.PathItem };

// A vinyl cutter follows every outline, so overlaps between joined letters would slice through
// the lettering. This merges them into one clean shape: what shows is exactly what gets cut.
export function mergeOutlines(outlines: Outline[]): paper.PathItem {
  const paths = outlines.flatMap(({ d, x, y }) => {
    const item = paper.PathItem.create(d);
    item.translate(new paper.Point(x, y));
    return item instanceof paper.CompoundPath ? [...item.children] : [item];
  });
  const compound = new paper.CompoundPath({ children: paths, fillRule: "nonzero", insert: false }) as unknown as Resolvable;
  return compound.resolveCrossings().reorient(true, true);
}

export function weldOutlines(outlines: Outline[], scale: number): string {
  const merged = mergeOutlines(outlines);
  merged.scale(scale, new paper.Point(0, 0));
  return merged.pathData;
}
