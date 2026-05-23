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

/** List request still in flight (Headlamp/K8s client has not returned data or an error yet). */
export function shouldShowNrcLoading(listItems: NodeReadinessRule[] | null, listError: unknown): boolean {
  return listItems === null && !listError;
}

/**
 * List failed — e.g. CRD not installed, cluster unreachable, or RBAC.
 * We intentionally do not run a separate install probe: ad-hoc fetch() from plugins can resolve
 * against file:// in Electron and become file:///…/clusters/… (ERR_FILE_NOT_FOUND).
 */
export function shouldShowNotInstalledBanner(listItems: NodeReadinessRule[] | null, listError: unknown): boolean {
  if (listItems !== null) {
    return false;
  }
  if (listItems === null && !listError) {
    return false;
  }
  return true;
}
