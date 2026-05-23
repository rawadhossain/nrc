/*
Copyright The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import type { NodeReadinessRule } from './resources/nodeReadinessRule';
import type { ConditionEvaluationResult, NodeEvaluation } from './types';

/** Minutes in “blocked” state before we highlight as stuck (spec: identify stuck nodes). */
export const STUCK_THRESHOLD_MINUTES = 10;

export interface ActiveBlockerRow {
  /** Stable key for React / sorting. */
  id: string;
  nodeName: string;
  blockingCondition: string;
  ruleName: string;
  lastEvaluationTime?: string;
  /** Minutes since lastEvaluationTime; null if unknown. */
  minutesInStateMax: number | null;
  stuck: boolean;
}

function conditionMismatchLabel(c: ConditionEvaluationResult): string {
  return `${c.type}: ${c.currentStatus} (required ${c.requiredStatus})`;
}

function minutesSince(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 60000;
}

/**
 * One row per (rule, evaluation, blocking condition), for live rules with taint still present.
 * Mirrors Detailed.md “Active Blocker Table” shape.
 */
export function buildActiveBlockerRows(rules: NodeReadinessRule[]): ActiveBlockerRow[] {
  const rows: ActiveBlockerRow[] = [];

  for (const rule of rules) {
    if (rule.dryRun) {
      continue;
    }

    const ruleName = rule.getName();
    const evals: NodeEvaluation[] = rule.status.nodeEvaluations ?? [];

    for (const ev of evals) {
      if (ev.taintStatus !== 'Present') {
        continue;
      }

      const mismatches = (ev.conditionResults ?? []).filter(
        c => c.currentStatus !== c.requiredStatus
      );

      const appendRow = (blockingCondition: string, suffix: string) => {
        const m = minutesSince(ev.lastEvaluationTime);
        rows.push({
          id: `${ruleName}::${ev.nodeName}::${suffix}`,
          nodeName: ev.nodeName,
          blockingCondition,
          ruleName,
          lastEvaluationTime: ev.lastEvaluationTime,
          minutesInStateMax: m,
          stuck: m !== null && m >= STUCK_THRESHOLD_MINUTES,
        });
      };

      if (mismatches.length === 0) {
        appendRow('(taint present — no failing conditions in status)', 'no-mismatch');
      } else {
        mismatches.forEach((c, i) => {
          appendRow(conditionMismatchLabel(c), `cond-${i}-${c.type}`);
        });
      }
    }
  }

  return rows;
}

export function formatDurationMinutes(mins: number | null): string {
  if (mins === null || Number.isNaN(mins)) {
    return '—';
  }
  if (mins < 1) {
    return '<1m';
  }
  if (mins < 60) {
    return `${Math.floor(mins)}m`;
  }
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h}h ${m}m`;
}

export function rowMatchesFilter(row: ActiveBlockerRow, q: string): boolean {
  if (!q.trim()) {
    return true;
  }
  const s = q.trim().toLowerCase();
  return (
    row.nodeName.toLowerCase().includes(s) ||
    row.ruleName.toLowerCase().includes(s) ||
    row.blockingCondition.toLowerCase().includes(s)
  );
}
