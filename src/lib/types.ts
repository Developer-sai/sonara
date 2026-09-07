export type MusicProvider =
  | "spotify"
  | "apple_music"
  | "youtube_music"
  | "youtube"
  | "soundcloud"
  | "deezer"
  | "amazon_music"
  | "tidal"
  | "itunes"
  | "demo"
  | "manual";

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl: string;
  provider: MusicProvider;
  externalUrl?: string | null;
  previewUrl?: string | null;
  durationMs?: number | null;
  rank?: number | null;
  genre?: string | null;
  /** Provider-native album id, when the source catalog exposes one — lets
   *  the client offer "add the whole album" without a second search. */
  albumId?: string | null;
}

/** "Arrange" templates — one-click starting positions for the elements
 *  currently on the canvas. Purely a placement helper now; everything they
 *  produce stays freely draggable/resizable/rotatable afterward. */
export type ArrangeTemplate =
  | "story_solo"
  | "grid_2x3"
  | "grid_3x3"
  | "polaroid"
  | "scatter";

export type CloudAspect = "9:16" | "1:1" | "4:5";

export type FontFamilyKey = "script" | "display" | "sans" | "serif";

export interface CloudTheme {
  backgroundMode: "amoled" | "aura_gradient" | "artwork_blur" | "solid" | "y2k_chrome";
  solidColor?: string;
  defaultFontFamily: FontFamilyKey;
}

export type CanvasElementType = "image" | "text";

interface BaseCanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface ImageCanvasElement extends BaseCanvasElement {
  type: "image";
  src: string;
  borderRadius: number;
  frame: "none" | "polaroid" | "circle";
  songId?: string | null;
  /** How a song-backed image is presented: bare artwork, a rendered "share
   *  card" (big/small) with the title & artist baked in, or title/artist as
   *  standalone text with no artwork at all. Undefined/"artwork" for plain
   *  uploaded photos and pre-existing clouds. */
  cardStyle?: "artwork" | "big" | "small" | "text";
}

export interface TextCanvasElement extends BaseCanvasElement {
  type: "text";
  content: string;
  fontFamily: FontFamilyKey;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  weight: number;
  /** Instagram-style highlight band behind the text; null/undefined = none. */
  backgroundColor?: string | null;
}

export type CanvasElement = ImageCanvasElement | TextCanvasElement;

export interface Cloud {
  id: string;
  userId?: string | null;
  title: string;
  subtitle?: string | null;
  aspectRatio: CloudAspect;
  theme: CloudTheme;
  items: Song[];
  elements: CanvasElement[];
  isPublic: boolean;
  shareSlug?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUsername?: string | null;
  ownerAvatar?: string | null;
}

export interface User {
  id: string;
  username: string;
  bio?: string | null;
  avatar?: string | null;
  createdAt: string;
}

export interface ConnectedAccount {
  id: string;
  provider: MusicProvider;
  displayName: string;
  avatar?: string | null;
  connectedAt: string;
  mode: "oauth" | "demo";
}

export const PROVIDER_META: Record<
  MusicProvider,
  { label: string; color: string; icon: string }
> = {
  spotify: { label: "Spotify", color: "#1DB954", icon: "spotify" },
  apple_music: { label: "Apple Music", color: "#FA243C", icon: "apple" },
  youtube_music: { label: "YouTube Music", color: "#FF0000", icon: "youtube" },
  youtube: { label: "YouTube", color: "#FF0000", icon: "youtube" },
  soundcloud: { label: "SoundCloud", color: "#FF5500", icon: "soundcloud" },
  deezer: { label: "Deezer", color: "#A238FF", icon: "deezer" },
  amazon_music: { label: "Amazon Music", color: "#00A8E1", icon: "amazon" },
  tidal: { label: "TIDAL", color: "#000000", icon: "tidal" },
  itunes: { label: "iTunes", color: "#FA57C1", icon: "apple" },
  demo: { label: "Demo", color: "#B06BFF", icon: "sparkles" },
  manual: { label: "Manual", color: "#9A9AA8", icon: "music" },
};
