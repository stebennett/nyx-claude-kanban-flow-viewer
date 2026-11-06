import matter from 'gray-matter';
import type { CardModel, ReworkCounts, CriteriaCount, PhaseName, PhaseDocsPresent } from './card-model.js';

export interface ParseCardOptions {
  dirName: string;
  entries?: readonly string[];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asNonNegInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asOptionalNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Unquoted ISO dates in YAML frontmatter (e.g. `created: 2026-07-18`) parse to a JS
 * `Date` via gray-matter's js-yaml engine, not a string. Coerce to a plain
 * 'YYYY-MM-DD' string so a `Date` never leaks into the CardModel / JSON API.
 */
function asDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value;
  return '';
}

function asReworks(value: unknown): ReworkCounts {
  const source = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    slice: asNonNegInt(source.slice),
    design: asNonNegInt(source.design),
    implement: asNonNegInt(source.implement),
    split: asNonNegInt(source.split),
    deliver: asNonNegInt(source.deliver),
  };
}

/**
 * Extracts the trimmed body text under a `## <heading>` line, stopping at the next
 * `#` or `##` heading (a `###` sub-heading does not terminate the section). Returns
 * '' when the heading is absent.
 */
export function extractSection(content: string, heading: string): string {
  const lines = content.split('\n');
  const headingPattern = new RegExp(`^##\\s+${heading}\\s*$`);
  const terminatorPattern = /^#{1,2}\s/;

  const startIndex = lines.findIndex((line) => headingPattern.test(line));
  if (startIndex === -1) return '';

  const bodyLines: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (terminatorPattern.test(line)) break;
    bodyLines.push(line);
  }

  return bodyLines.join('\n').trim();
}

const DONE_CHECKBOX_PATTERN = /^\s*-\s\[[xX]\]/;
const UNCHECKED_CHECKBOX_PATTERN = /^\s*-\s\[ \]/;

/**
 * Counts `- [ ]` / `- [x]` checkbox lines in the given section text (typically the
 * output of extractSection). `total` is done + not-done; other lines are ignored.
 */
export function countCriteria(sectionText: string): CriteriaCount {
  const lines = sectionText.split('\n');
  let done = 0;
  let notDone = 0;

  for (const line of lines) {
    if (DONE_CHECKBOX_PATTERN.test(line)) {
      done++;
    } else if (UNCHECKED_CHECKBOX_PATTERN.test(line)) {
      notDone++;
    }
  }

  return { done, total: done + notDone };
}

/**
 * True when `names` contains a check-doc variant for `phase`: the exact
 * `<phase>-check.md`, or a numbered/named variant `<phase>-check-*.md`.
 */
function hasCheckDoc(phase: PhaseName, names: Set<string>): boolean {
  return (
    names.has(`${phase}-check.md`) ||
    [...names].some((n) => n.startsWith(`${phase}-check-`) && n.endsWith('.md'))
  );
}

/**
 * Derives, per phase, whether the phase's doc and/or check doc(s) are present in a
 * card dir's entries listing. Pure: reads only `entries`, never touches the filesystem
 * (the caller already performed the one `readdir` to locate `card.md`).
 */
export function derivePhaseDocsPresent(entries: readonly string[] | undefined): PhaseDocsPresent {
  const names = new Set(entries ?? []);

  return {
    slice: { phase: names.has('slice.md'), check: hasCheckDoc('slice', names) },
    design: { phase: names.has('design.md'), check: hasCheckDoc('design', names) },
    implement: { phase: names.has('implement.md'), check: hasCheckDoc('implement', names) },
    test: { phase: names.has('test.md'), check: hasCheckDoc('test', names) },
    review: { phase: names.has('review.md'), check: hasCheckDoc('review', names) },
    deliver: { phase: names.has('deliver.md'), check: hasCheckDoc('deliver', names) },
  };
}

export function parseCard(raw: string, options: ParseCardOptions): CardModel {
  const { data, content } = matter(raw);

  const model: CardModel = {
    id: asString(data.id),
    title: asString(data.title),
    status: asString(data.status),
    phase: asString(data.phase),
    type: asString(data.type),
    layer: asString(data.layer),
    dependsOn: asStringArray(data.depends_on),
    branch: asString(data.branch),
    worktree: asString(data.worktree),
    designPrUrl: asString(data.design_pr_url),
    prUrls: asStringArray(data.pr_urls),
    splitSlices: asNonNegInt(data.split_slices),
    adrs: asStringArray(data.adrs),
    reworks: asReworks(data.reworks),
    estimatedLines: asNumberOrNull(data.estimated_lines),
    actualLines: asNumberOrNull(data.actual_lines),
    criteria: countCriteria(extractSection(content, 'Acceptance criteria')),
    why: extractSection(content, 'Why'),
    notes: extractSection(content, 'Notes'),
    blocker: asOptionalNonEmptyString(data.blocker),
    created: asDateString(data.created),
    started: asDateString(data.started),
    delivered: asDateString(data.delivered),
    dirName: options.dirName,
    phaseDocsPresent: derivePhaseDocsPresent(options.entries),
  };

  return model;
}
