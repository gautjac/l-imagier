import Dexie, { type Table } from "dexie";

/** Structured tags returned by Claude vision for a single image. */
export interface ImageTags {
  /** Composition: shot size, leading lines, balance, symmetry, framing. */
  composition: string[];
  /** Mood / atmosphere words. */
  mood: string[];
  /** Subject / content tags. */
  subject: string[];
  /** Lighting tags (quality, direction, key/fill, time of day). */
  lighting: string[];
  /** One-line "why it catches the eye" / "pourquoi ça accroche". */
  accroche: string;
}

export function emptyTags(): ImageTags {
  return { composition: [], mood: [], subject: [], lighting: [], accroche: "" };
}

/** A captured image, stored as a blob with its tags + real palette. */
export interface ImageRecord {
  id: string;
  blob: Blob; // the stored JPEG
  thumb: string; // small data-URL thumbnail
  palette: string[]; // real, pinned hexes (median-cut)
  tags: ImageTags;
  /** Manual tags the user added on top of (or instead of) the AI tags. */
  manualTags: string[];
  /** AI status: idle (never run) | running | done | error. */
  aiStatus: "idle" | "running" | "done" | "error";
  aiError?: string;
  width: number;
  height: number;
  /** Optional source note (filename, URL it came from, etc.). */
  source?: string;
  title?: string;
  createdAt: number;
}

/** A moodboard. */
export interface BoardRecord {
  id: string;
  title: string;
  /** Optional intent / brief the board is exploring. */
  brief?: string;
  createdAt: number;
  updatedAt: number;
  /** Cached throughline write-up (the signature feature). */
  throughline?: Throughline;
}

export interface Throughline {
  /** A short name for the visual DNA. */
  nom: string;
  /** A treatment paragraph describing the look. */
  traitement: string;
  /** 3–5 visual principles the board embodies. */
  principes: string[];
  /** The dominant palette across the board (pinned hexes, not invented). */
  paletteDominante: string[];
  /** Recurring moods / subjects / compositional habits. */
  recurrences: string[];
  generatedAt: number;
}

/** Membership: an image pinned to a board, with order + free placement. */
export interface MembershipRecord {
  id: string; // `${boardId}:${imageId}`
  boardId: string;
  imageId: string;
  ordre: number;
  addedAt: number;
}

export interface Settings {
  cle: "settings";
  theme: "light" | "dark";
  onboardingVu: boolean;
}

class ImagierDB extends Dexie {
  images!: Table<ImageRecord, string>;
  boards!: Table<BoardRecord, string>;
  memberships!: Table<MembershipRecord, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("l-imagier");
    this.version(1).stores({
      images: "id, createdAt, aiStatus",
      boards: "id, createdAt, updatedAt",
      memberships: "id, boardId, imageId, ordre",
      settings: "cle",
    });
  }
}

export const db = new ImagierDB();

export function uid(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${rand}` : rand;
}

// ── Settings ──────────────────────────────────────────────────────────────
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("settings");
  if (s) return s;
  const init: Settings = { cle: "settings", theme: "dark", onboardingVu: false };
  await db.settings.put(init);
  return init;
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch });
}

// ── Images ──────────────────────────────────────────────────────────────
export async function addImage(rec: ImageRecord): Promise<void> {
  await db.images.put(rec);
}

export async function updateImage(id: string, patch: Partial<ImageRecord>): Promise<void> {
  await db.images.update(id, patch);
}

/** Delete an image AND its board memberships (cascade clean). */
export async function deleteImage(id: string): Promise<void> {
  await db.transaction("rw", db.images, db.memberships, async () => {
    await db.images.delete(id);
    const mems = await db.memberships.where("imageId").equals(id).toArray();
    await db.memberships.bulkDelete(mems.map((m) => m.id));
  });
}

// ── Boards ──────────────────────────────────────────────────────────────
export async function createBoard(title: string, brief?: string): Promise<string> {
  const id = uid("brd");
  const now = Date.now();
  await db.boards.put({ id, title, brief, createdAt: now, updatedAt: now });
  return id;
}

export async function updateBoard(id: string, patch: Partial<BoardRecord>): Promise<void> {
  await db.boards.update(id, { ...patch, updatedAt: Date.now() });
}

/** Delete a board AND its memberships (images themselves stay in the library). */
export async function deleteBoard(id: string): Promise<void> {
  await db.transaction("rw", db.boards, db.memberships, async () => {
    await db.boards.delete(id);
    const mems = await db.memberships.where("boardId").equals(id).toArray();
    await db.memberships.bulkDelete(mems.map((m) => m.id));
  });
}

// ── Membership ────────────────────────────────────────────────────────────
export async function addToBoard(boardId: string, imageId: string): Promise<void> {
  const id = `${boardId}:${imageId}`;
  const existing = await db.memberships.get(id);
  if (existing) return;
  const count = await db.memberships.where("boardId").equals(boardId).count();
  await db.memberships.put({ id, boardId, imageId, ordre: count, addedAt: Date.now() });
  await db.boards.update(boardId, { updatedAt: Date.now() });
}

export async function removeFromBoard(boardId: string, imageId: string): Promise<void> {
  await db.memberships.delete(`${boardId}:${imageId}`);
  await db.boards.update(boardId, { updatedAt: Date.now() });
}

/** Persist a new ordering for a board (array of imageIds in display order). */
export async function reorderBoard(boardId: string, imageIds: string[]): Promise<void> {
  await db.transaction("rw", db.memberships, async () => {
    for (let i = 0; i < imageIds.length; i++) {
      await db.memberships.update(`${boardId}:${imageIds[i]}`, { ordre: i });
    }
  });
  await db.boards.update(boardId, { updatedAt: Date.now() });
}

/** Gather every searchable tag string for an image (AI + manual + colour families). */
export function allTagsOf(img: ImageRecord): string[] {
  const t = img.tags;
  return [
    ...t.composition,
    ...t.mood,
    ...t.subject,
    ...t.lighting,
    ...img.manualTags,
  ].map((s) => s.trim()).filter(Boolean);
}
