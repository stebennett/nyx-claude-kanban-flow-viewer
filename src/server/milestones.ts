import type { CardModel, MilestoneProgress } from './card-model.js';

interface ParsedMilestone {
  name: string;
  cardIds: string[];
}

const MILESTONE_HEADING_PATTERN = /^##\s+(M\d+.*)$/;
const ANY_HEADING_PATTERN = /^#{1,2}\s/;
const CARDS_LINE_PATTERN = /^\s*\*\*Cards:\*\*/;
const CARD_ID_PATTERN = /CARD-\d+/g;

/**
 * Structural line-scan of MILESTONES.md. Deliberately does NOT reuse
 * `parse-card.ts`'s `extractSection`: milestone headings are dynamic
 * (`## M<N> — <title>`) and `extractSection` interpolates its heading arg
 * unescaped into a RegExp (KNOWLEDGE [CARD-019→020]). Every pattern here is
 * fixed, so no user/spec text is ever compiled into a regex.
 */
export function parseMilestones(raw: string): ParsedMilestone[] {
  const milestones: ParsedMilestone[] = [];
  let current: ParsedMilestone | null = null;

  // Split on CRLF or bare LF so a CRLF-checked-out MILESTONES.md (e.g. git-for-Windows
  // core.autocrlf=true) doesn't leave a trailing \r on every line — \r fails every
  // pattern below (`.` excludes it, and `$` without the `m` flag won't match before it),
  // so headings would otherwise fall through to the terminator branch and be dropped.
  for (const line of raw.split(/\r\n|\n/)) {
    const headingMatch = line.match(MILESTONE_HEADING_PATTERN);
    if (headingMatch) {
      // Group 1 is mandatory in the pattern (no `?`), so it's always populated here.
      current = { name: headingMatch[1]!.trim(), cardIds: [] };
      milestones.push(current);
      continue;
    }

    if (ANY_HEADING_PATTERN.test(line)) {
      // Any non-milestone heading (e.g. `## Notes`) closes the current block, so a
      // stray `**Cards:**` line under it can't leak into the milestone above.
      current = null;
      continue;
    }

    if (current && CARDS_LINE_PATTERN.test(line)) {
      current.cardIds.push(...(line.match(CARD_ID_PATTERN) ?? []));
    }
  }

  return milestones;
}

/**
 * Derives per-milestone completion from the raw MILESTONES.md text and the
 * already-parsed cards. `done` counts only cards whose `status === 'done'`
 * (the spec's sole terminal status — `split`/`superseded` do NOT count);
 * `total` counts every listed id, so a milestone id with no parsed card
 * contributes to `total` but never to `done` and never throws (mirrors the
 * board walk's totality, ADR-0008).
 */
export function deriveMilestones(
  raw: string,
  cards: readonly Pick<CardModel, 'id' | 'status'>[],
): MilestoneProgress[] {
  const statusById = new Map(cards.map((c) => [c.id, c.status]));

  return parseMilestones(raw).map(({ name, cardIds }) => ({
    name,
    cardIds,
    total: cardIds.length,
    done: cardIds.filter((id) => statusById.get(id) === 'done').length,
  }));
}
