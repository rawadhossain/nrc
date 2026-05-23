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

/** Paths under the cluster URL (no `/c/:cluster` prefix). */
export const PLUGIN_ROOT = '/node-readiness';

export const PLUGIN_ROUTE = {
  overview: `${PLUGIN_ROOT}/overview`,
  blockers: `${PLUGIN_ROOT}/blockers`,
  rulesList: `${PLUGIN_ROOT}/rules`,
  ruleDetail: `${PLUGIN_ROOT}/rules/:name`,
} as const;

/**
 * Names passed to registerRoute({ name }) — must match createRouteURL / Link routeName usage.
 */
export const ROUTE_NAME = {
  ruleDetail: 'nrc-rule-detail',
  rulesList: 'nrc-rules-list',
  overview: 'nrc-overview',
  blockers: 'nrc-blockers',
} as const;
