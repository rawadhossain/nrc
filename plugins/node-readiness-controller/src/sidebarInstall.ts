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

/**
 * Runs before any page components load. Headlamp evaluates all static imports
 * of a plugin before running the entry body; keeping sidebar-only logic here
 * ensures menu entries register even if a view module fails during evaluation.
 */
import { registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import { registerNrcPluginBuildMarker } from './pluginBuildId';
import { PLUGIN_ROUTE } from './pluginRoutes';

registerNrcPluginBuildMarker();

registerSidebarEntry({
  parent: null,
  name: 'nodeReadiness',
  label: 'Node readiness',
  icon: 'mdi:heart-pulse',
  url: PLUGIN_ROUTE.overview,
});

registerSidebarEntry({
  parent: 'nodeReadiness',
  name: 'nrc-overview',
  label: 'Overview',
  url: PLUGIN_ROUTE.overview,
});

registerSidebarEntry({
  parent: 'nodeReadiness',
  name: 'nrc-blockers',
  label: 'Active blockers',
  url: PLUGIN_ROUTE.blockers,
});

registerSidebarEntry({
  parent: 'nodeReadiness',
  name: 'nrc-rules',
  label: 'Rules',
  url: PLUGIN_ROUTE.rulesList,
});
