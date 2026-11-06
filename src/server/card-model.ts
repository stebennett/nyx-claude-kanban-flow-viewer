export interface ReworkCounts {
  slice: number;
  design: number;
  implement: number;
  split: number;
  deliver: number;
}

export interface CriteriaCount {
  done: number;
  total: number;
}

export const PHASE_NAMES = ['slice', 'design', 'implement', 'test', 'review', 'deliver'] as const;
export type PhaseName = (typeof PHASE_NAMES)[number];

export interface PhaseDocPresence {
  phase: boolean;
  check: boolean;
}

export type PhaseDocsPresent = { [P in PhaseName]: PhaseDocPresence };

export interface CardModel {
  id: string;
  title: string;
  status: string;
  phase: string;
  type: string;
  layer: string;
  dependsOn: string[];
  branch: string;
  worktree: string;
  designPrUrl: string;
  prUrls: string[];
  splitSlices: number;
  adrs: string[];
  reworks: ReworkCounts;
  estimatedLines: number | null;
  actualLines: number | null;
  criteria: CriteriaCount;
  why: string;
  notes: string;
  blocker?: string;
  created: string;
  started: string;
  delivered: string;
  dirName: string;
  phaseDocsPresent: PhaseDocsPresent;
}

export interface BoardConfig {
  wipLimit: number;
}

export interface ParseError {
  path: string;
  error: string;
}

export interface MilestoneProgress {
  name: string;
  cardIds: string[];
  done: number;
  total: number;
}

export interface BoardSnapshot {
  generatedAt: string;
  projectName: string;
  config: BoardConfig;
  cards: CardModel[];
  milestones: MilestoneProgress[];
  parseErrors: ParseError[];
}
