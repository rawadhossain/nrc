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

import type { KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

/** Mirror of api/v1alpha1 condition + evaluation shapes used in status. */
export type ConditionStatus = 'True' | 'False' | 'Unknown';

export interface ConditionEvaluationResult {
  type: string;
  currentStatus: ConditionStatus;
  requiredStatus: ConditionStatus;
}

export interface NodeEvaluation {
  nodeName: string;
  conditionResults?: ConditionEvaluationResult[];
  taintStatus: 'Present' | 'Absent';
  lastEvaluationTime?: string;
}

export interface NodeFailure {
  nodeName: string;
  reason?: string;
  message?: string;
  lastEvaluationTime?: string;
}

export interface DryRunResults {
  affectedNodes?: number;
  taintsToAdd?: number;
  taintsToRemove?: number;
  riskyOperations?: number;
  summary?: string;
}

export interface NodeReadinessRuleSpec {
  conditions: Array<{
    type: string;
    requiredStatus: ConditionStatus;
  }>;
  enforcementMode: 'bootstrap-only' | 'continuous';
  taint: {
    key: string;
    value?: string;
    effect: string;
  };
  nodeSelector: Record<string, unknown>;
  dryRun?: boolean;
}

export interface NodeReadinessRuleStatus {
  observedGeneration?: number;
  appliedNodes?: string[];
  failedNodes?: NodeFailure[];
  nodeEvaluations?: NodeEvaluation[];
  dryRunResults?: DryRunResults;
}

/** CR document shape for NodeReadinessRule (kept here to avoid cycles with `nodeReadinessRule.ts`). */
export interface NodeReadinessRuleJson extends KubeObjectInterface {
  spec: NodeReadinessRuleSpec;
  status?: NodeReadinessRuleStatus;
}
