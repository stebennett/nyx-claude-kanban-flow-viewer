import matter from 'gray-matter';
import type { CardModel, ReworkCounts, CriteriaCount } from './card-model.js';

export interface ParseCardOptions {
  dirName: string;
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

export function parseCard(raw: string, options: ParseCardOptions): CardModel {
  const { data } = matter(raw);

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
    criteria: { done: 0, total: 0 } satisfies CriteriaCount,
    why: '',
    notes: '',
    created: asString(data.created),
    started: asString(data.started),
    delivered: asString(data.delivered),
    dirName: options.dirName,
  };

  return model;
}
