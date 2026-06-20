# L'Imagier — la table lumineuse du regard

A visual-inspiration **capture & curation studio** for a filmmaker-poet. Drop in
stills, frames, and photos → Claude **vision** auto-tags them (composition,
lighting, mood, subject + a one-line "why it catches the eye") → assemble
**moodboards** → L'Imagier distills the **throughline** in your taste and writes
a treatment-ready look-book.

Part of Jac's *Atelier / La shop* family (the house stack).

## What it does

- **Capture** — drag-and-drop, paste (⌘V), or fetch an image URL. Images are
  stored locally as blobs (IndexedDB); thumbnails are generated client-side.
- **Auto-tag** — `/api/tag` (Claude Opus vision, NDJSON keepalive) returns
  structured tags: composition, lighting, mood, subject, and an *accroche*.
  The **palette is extracted client-side** via median-cut — real, pinned hexes,
  never invented by the model. Manual tags can be added per image.
- **Boards** — named moodboards with an optional brief; pin images, drag to
  reorder on a contact-sheet pin-wall.
- **Throughline** — `/api/throughline` (Claude Opus, NDJSON keepalive) names the
  board's recurring visual DNA: dominant palette (re-pinned to colours that
  actually appear), compositional habits, recurring moods/subjects, a director's
  treatment paragraph, and 3–5 visual principles. The signature feature.
- **Browse & filter** the whole library by tag, mood, dominant colour, or board.
- **Export** a board as a high-res PNG look-book (`html-to-image`) or as JSON
  (with the throughline write-up).

Bilingual FR/EN from the first commit (shared `atelier:lang`), light + dark
themes, fully local-first.

## Stack

Vite · React 19 · TypeScript · Tailwind v3 · Dexie (IndexedDB) · Netlify
Functions calling the Claude API (`claude-opus-4-8`). Type identity: **Fraunces**
+ **Archivo** + **Space Mono**; a darkroom light-table palette (sodium-amber
safelight + a cool cyan throughline accent).

## Dev

```bash
npm install
npm run dev      # netlify dev (functions + vite)
npm run build    # tsc -b && vite build
npm test         # vitest — palette / median-cut math
```

Requires `CLAUDE_API_KEY` set on the Netlify site.
