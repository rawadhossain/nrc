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

import { KubeObject } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { PLUGIN_ROUTE } from '../pluginRoutes';
import type { NodeReadinessRuleJson } from '../types';

export class NodeReadinessRule extends KubeObject<NodeReadinessRuleJson> {
  static apiVersion = 'readiness.node.x-k8s.io/v1alpha1';
  static kind = 'NodeReadinessRule';
  static apiName = 'nodereadinessrules';
  static isNamespaced = false;

  static get detailsRoute() {
    return PLUGIN_ROUTE.ruleDetail;
  }

  static get listRoute() {
    return PLUGIN_ROUTE.rulesList;
  }

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status ?? {};
  }

  get enforcementMode(): string {
    return this.spec?.enforcementMode ?? '';
  }

  get dryRun(): boolean {
    return !!this.spec?.dryRun;
  }

  get taintKey(): string {
    return this.spec?.taint?.key ?? '';
  }

  get taintEffect(): string {
    return this.spec?.taint?.effect ?? '';
  }

  get appliedNodeCount(): number {
    return this.status?.appliedNodes?.length ?? 0;
  }

  get failedNodeCount(): number {
    return this.status?.failedNodes?.length ?? 0;
  }

  get evaluatedNodeCount(): number {
    return this.status?.nodeEvaluations?.length ?? 0;
  }
}
