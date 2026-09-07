import type { CloudAspect } from "./types";

/** Target export resolution per aspect ratio (also used for display labels). */
export const EXPORT_META: Record<CloudAspect, { label: string; w: number; h: number }> = {
  "9:16": { label: "Story (9:16)", w: 1080, h: 1920 },
  "1:1": { label: "Square (1:1)", w: 1080, h: 1080 },
  "4:5": { label: "Portrait (4:5)", w: 1080, h: 1350 },
};

/** The coordinate space every element's x/y/width/height is stored in. Kept
 *  deliberately smaller than the export resolution — the Fabric canvas is
 *  interacted with at this size, and toBlob()'s multiplier scales it up to
 *  EXPORT_META resolution only at export time. Both the studio store and
 *  FreeformCanvas must agree on this or elements land off-canvas. */
export const EDIT_WIDTH = 480;

export function getEditDims(aspectRatio: CloudAspect) {
  const { w, h } = EXPORT_META[aspectRatio];
  const editW = EDIT_WIDTH;
  const editH = Math.round(EDIT_WIDTH * (h / w));
  return { editW, editH, multiplier: w / editW };
}
