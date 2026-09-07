"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  ArrangeTemplate,
  CanvasElement,
  CloudAspect,
  CloudTheme,
  Cloud,
  ImageCanvasElement,
  Song,
  TextCanvasElement,
} from "@/lib/types";
import { EXPORT_META, getEditDims } from "@/lib/canvasDims";
import { renderSongCard, type SongCardStyle } from "@/lib/songCard";

export const DEFAULT_THEME: CloudTheme = {
  backgroundMode: "amoled",
  defaultFontFamily: "script",
};

function nextZIndex(elements: CanvasElement[]) {
  return elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1;
}

interface StudioState {
  cloudId: string | null;
  title: string;
  subtitle: string;
  aspectRatio: CloudAspect;
  theme: CloudTheme;
  songs: Song[];
  elements: CanvasElement[];
  selectedId: string | null;
  palette: string[];
  isSaving: boolean;
  isDirty: boolean;
  savedAt: number;
  viewZoom: number;
  setViewZoom: (zoom: number) => void;
  past: CanvasElement[][];
  future: CanvasElement[][];
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  setAspectRatio: (ratio: CloudAspect) => void;
  setTheme: (theme: Partial<CloudTheme>) => void;
  setPalette: (palette: string[]) => void;
  setSelectedId: (id: string | null) => void;

  addSong: (song: Song) => void;
  addSongs: (songs: Song[]) => void;
  removeSong: (id: string) => void;
  clearSongs: () => void;

  addImageElement: (
    src: string,
    opts?: Partial<ImageCanvasElement>,
    meta?: { skipHistory?: boolean }
  ) => string;
  addTextElement: (opts?: Partial<TextCanvasElement>) => string;
  setElementCardStyle: (id: string, style: SongCardStyle) => Promise<void>;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  setElements: (elements: CanvasElement[]) => void;
  applyTemplate: (template: ArrangeTemplate) => void;
  clearCanvas: () => void;

  loadCloud: (cloud: Cloud) => void;
  reset: () => void;
}

const initial = {
  cloudId: null as string | null,
  title: "My Music Cloud",
  subtitle: "",
  aspectRatio: "9:16" as CloudAspect,
  theme: DEFAULT_THEME,
  songs: [] as Song[],
  elements: [] as CanvasElement[],
  selectedId: null as string | null,
  palette: ["#b06bff", "#ff5fa8", "#5fc9ff", "#ffd35f"],
  isSaving: false,
  isDirty: false,
  savedAt: 0,
  viewZoom: 1,
  past: [] as CanvasElement[][],
  future: [] as CanvasElement[][],
};

const MAX_HISTORY = 40;

/** Fit a rendered card's natural (logical) pixel size into the current
 *  aspect ratio's edit space, preserving its aspect ratio. */
function fitCardSize(naturalW: number, naturalH: number, aspectRatio: CloudAspect) {
  const { editW, editH } = getEditDims(aspectRatio);
  const maxW = editW * 0.72;
  const maxH = editH * 0.6;
  const ratio = Math.min(maxW / naturalW, maxH / naturalH, 1.4);
  return { width: naturalW * ratio, height: naturalH * ratio };
}

/** Render a song's default "big card" before it ever touches the canvas.
 *  Building the Fabric object is itself async (image decode over the proxy),
 *  so swapping `src` on an already-placed placeholder races that load and
 *  can get silently dropped — awaiting the card first and inserting once,
 *  fully formed, sidesteps that class of bug entirely. */
async function placeSongOnCanvas(
  song: Song,
  get: () => StudioState,
  skipHistory: boolean
) {
  const result = await renderSongCard(song, "big").catch(() => null);
  const opts: Partial<ImageCanvasElement> = { songId: song.id, frame: "none" };
  if (result) {
    opts.src = result.src;
    opts.cardStyle = "big";
    Object.assign(opts, fitCardSize(result.width, result.height, get().aspectRatio));
  } else {
    opts.cardStyle = "artwork";
  }
  get().addImageElement(opts.src || song.artworkUrl, opts, { skipHistory });
}

export const useStudioStore = create<StudioState>((set, get) => ({
  ...initial,

  setTitle: (title) => set({ title, isDirty: true }),
  setSubtitle: (subtitle) => set({ subtitle, isDirty: true }),
  setAspectRatio: (aspectRatio) => {
    const from = getEditDims(get().aspectRatio);
    const to = getEditDims(aspectRatio);
    const sx = to.editW / from.editW;
    const sy = to.editH / from.editH;
    set({
      aspectRatio,
      elements: get().elements.map((el) => ({
        ...el,
        x: el.x * sx,
        y: el.y * sy,
        width: el.width * sx,
        height: el.height * sy,
      })),
      isDirty: true,
    });
  },
  setTheme: (theme) => set({ theme: { ...get().theme, ...theme }, isDirty: true }),
  setPalette: (palette) => set({ palette }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setViewZoom: (viewZoom) => set({ viewZoom: Math.min(2.5, Math.max(0.4, viewZoom)) }),

  pushHistory: () => {
    const past = [...get().past, get().elements].slice(-MAX_HISTORY);
    set({ past, future: [] });
  },
  undo: () => {
    const { past, elements, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      elements: previous,
      past: past.slice(0, -1),
      future: [elements, ...future].slice(0, MAX_HISTORY),
      selectedId: null,
      isDirty: true,
    });
  },
  redo: () => {
    const { past, elements, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      elements: next,
      past: [...past, elements].slice(-MAX_HISTORY),
      future: future.slice(1),
      selectedId: null,
      isDirty: true,
    });
  },

  addSong: (song) => {
    if (get().songs.some((s) => s.title === song.title && s.artist === song.artist)) return;
    get().pushHistory();
    const withId = { ...song, id: song.id || nanoid() };
    set({ songs: [...get().songs, withId], isDirty: true });
    placeSongOnCanvas(withId, get, true).catch(() => {});
  },
  addSongs: (songs) => {
    const existingKeys = new Set(get().songs.map((s) => `${s.title}::${s.artist}`));
    const fresh = songs
      .filter((s) => !existingKeys.has(`${s.title}::${s.artist}`))
      .map((s) => ({ ...s, id: s.id || nanoid() }));
    if (fresh.length === 0) return;
    get().pushHistory();
    set({ songs: [...get().songs, ...fresh], isDirty: true });
    fresh.forEach((s) => {
      placeSongOnCanvas(s, get, true).catch(() => {});
    });
  },
  removeSong: (id) => {
    get().pushHistory();
    set({
      songs: get().songs.filter((s) => s.id !== id),
      elements: get().elements.filter((el) => !(el.type === "image" && el.songId === id)),
      isDirty: true,
    });
  },
  clearSongs: () => set({ songs: [], isDirty: true }),

  addImageElement: (src, opts, meta) => {
    if (!meta?.skipHistory) get().pushHistory();
    const elements = get().elements;
    const id = nanoid();
    const cascade = (elements.length % 6) * 18;
    const { editW: w, editH: h } = getEditDims(get().aspectRatio);
    const size = Math.min(w, h) * 0.42;
    const element: ImageCanvasElement = {
      id,
      type: "image",
      x: w / 2 + cascade,
      y: h / 2 + cascade,
      width: size,
      height: size,
      rotation: 0,
      zIndex: nextZIndex(elements),
      src,
      borderRadius: 24,
      frame: "none",
      songId: null,
      ...opts,
    };
    set({ elements: [...elements, element], selectedId: id, isDirty: true });
    return id;
  },

  addTextElement: (opts) => {
    get().pushHistory();
    const elements = get().elements;
    const id = nanoid();
    const { editW: w, editH: h } = getEditDims(get().aspectRatio);
    const element: TextCanvasElement = {
      id,
      type: "text",
      x: w / 2,
      y: h / 2,
      width: w * 0.7,
      height: 100,
      rotation: 0,
      zIndex: nextZIndex(elements),
      content: "Tap to edit",
      fontFamily: get().theme.defaultFontFamily,
      fontSize: 64,
      color: "#ffffff",
      align: "center",
      weight: 600,
      ...opts,
    };
    set({ elements: [...elements, element], selectedId: id, isDirty: true });
    return id;
  },

  updateElement: (id, patch) => {
    get().pushHistory();
    set({
      elements: get().elements.map((el) =>
        el.id === id ? ({ ...el, ...patch } as CanvasElement) : el
      ),
      isDirty: true,
    });
  },

  setElementCardStyle: async (id, style) => {
    const el = get().elements.find((e) => e.id === id) as ImageCanvasElement | undefined;
    if (!el || el.type !== "image" || !el.songId) return;
    const song = get().songs.find((s) => s.id === el.songId);
    if (!song) return;
    const result = await renderSongCard(song, style);
    if (!result) return;
    const { width, height } = fitCardSize(result.width, result.height, get().aspectRatio);
    get().updateElement(id, {
      src: result.src,
      width,
      height,
      cardStyle: style,
      frame: "none",
      borderRadius: 0,
    });
  },

  removeElement: (id) => {
    get().pushHistory();
    set({
      elements: get().elements.filter((el) => el.id !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
      isDirty: true,
    });
  },

  duplicateElement: (id) => {
    const el = get().elements.find((e) => e.id === id);
    if (!el) return;
    get().pushHistory();
    const copy: CanvasElement = {
      ...el,
      id: nanoid(),
      x: el.x + 24,
      y: el.y + 24,
      zIndex: nextZIndex(get().elements),
    };
    set({ elements: [...get().elements, copy], selectedId: copy.id, isDirty: true });
  },

  bringForward: (id) => {
    get().pushHistory();
    const elements = get().elements;
    const top = nextZIndex(elements);
    set({
      elements: elements.map((el) => (el.id === id ? { ...el, zIndex: top } : el)),
      isDirty: true,
    });
  },
  sendBackward: (id) => {
    get().pushHistory();
    const elements = get().elements;
    const bottom = Math.min(...elements.map((e) => e.zIndex), 0) - 1;
    set({
      elements: elements.map((el) => (el.id === id ? { ...el, zIndex: bottom } : el)),
      isDirty: true,
    });
  },

  setElements: (elements) => set({ elements, isDirty: true }),

  applyTemplate: (template) => {
    get().pushHistory();
    const { editW: w, editH: h } = getEditDims(get().aspectRatio);
    const images = get().elements.filter((el): el is ImageCanvasElement => el.type === "image");
    const others = get().elements.filter((el) => el.type !== "image");
    const arranged = arrangeImages(template, images, w, h);
    set({ elements: [...others, ...arranged], isDirty: true });
  },

  clearCanvas: () => {
    get().pushHistory();
    set({ elements: [], selectedId: null, isDirty: true });
  },

  loadCloud: (cloud) =>
    set({
      cloudId: cloud.id,
      title: cloud.title,
      subtitle: cloud.subtitle || "",
      aspectRatio: cloud.aspectRatio,
      theme: { ...DEFAULT_THEME, ...cloud.theme },
      songs: cloud.items,
      elements: cloud.elements || [],
      isDirty: false,
      past: [],
      future: [],
    }),

  reset: () => set({ ...initial, songs: [], elements: [], past: [], future: [] }),
}));

/** Export-resolution labels/dims — re-exported here for convenience since most
 *  studio components already import aspect-ratio info from this module.
 *  Element coordinates themselves live in the smaller EDIT_WIDTH space from
 *  `@/lib/canvasDims` — see getEditDims(). */
export const ASPECT_META = EXPORT_META;

export const ARRANGE_TEMPLATE_META: Record<ArrangeTemplate, { label: string; description: string }> = {
  story_solo: { label: "Solo", description: "One big centered photo" },
  grid_2x3: { label: "2×3 Grid", description: "Six rounded cards in a grid" },
  grid_3x3: { label: "3×3 Grid", description: "Nine cards for a fuller aura" },
  polaroid: { label: "Polaroid", description: "Tilted scattered stack" },
  scatter: { label: "Scatter", description: "Loose freeform scatter" },
};

function arrangeImages(
  template: ArrangeTemplate,
  images: ImageCanvasElement[],
  w: number,
  h: number
): ImageCanvasElement[] {
  if (images.length === 0) return images;

  if (template === "story_solo") {
    const size = Math.min(w, h) * 0.62;
    return images.map((img, i) => ({
      ...img,
      x: w / 2,
      y: h / 2,
      width: size,
      height: size,
      rotation: 0,
      frame: "none" as const,
      zIndex: i,
    }));
  }

  if (template === "grid_2x3" || template === "grid_3x3") {
    const cols = template === "grid_2x3" ? 2 : 3;
    const rows = template === "grid_2x3" ? 3 : 3;
    const max = Math.min(images.length, cols * rows);
    const padX = w * 0.08;
    const padY = h * 0.06;
    const gap = w * 0.04;
    const cellW = (w - padX * 2 - gap * (cols - 1)) / cols;
    const cellH = cellW * 1.25;
    const gridH = cellH * rows + gap * (rows - 1);
    const startY = Math.max(padY, (h - gridH) / 2);
    const arranged: ImageCanvasElement[] = images.slice(0, max).map((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...img,
        x: padX + col * (cellW + gap) + cellW / 2,
        y: startY + row * (cellH + gap) + cellH / 2,
        width: cellW,
        height: cellH,
        rotation: 0,
        frame: "none",
        zIndex: i,
      };
    });
    return arranged.concat(images.slice(max));
  }

  if (template === "polaroid") {
    const size = Math.min(w, h) * 0.42;
    return images.map((img, i) => {
      const angle = (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 4);
      const col = i % 3;
      const row = Math.floor(i / 3);
      return {
        ...img,
        x: w * (0.28 + col * 0.24),
        y: h * (0.32 + row * 0.24),
        width: size,
        height: size,
        rotation: angle,
        frame: "polaroid" as const,
        zIndex: i,
      };
    });
  }

  // scatter
  return images.map((img, i) => {
    const angle = ((i * 37) % 40) - 20;
    const size = Math.min(w, h) * (0.3 + ((i % 3) * 0.05));
    return {
      ...img,
      x: w * (0.25 + ((i * 0.618) % 0.5)),
      y: h * (0.2 + ((i * 0.382) % 0.6)),
      width: size,
      height: size,
      rotation: angle,
      zIndex: i,
    };
  });
}
