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
}
