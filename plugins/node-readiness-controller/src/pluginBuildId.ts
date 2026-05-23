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

/** Bump when debugging “still seeing old behavior” — proves which bundle Headlamp executed. */
export const NRC_PLUGIN_BUILD_ID = '2026-05-10-no-list-probe';

declare global {
  interface Window {
    __NRC_HEADLAMP_PLUGIN__?: { buildId: string };
  }
}

export function registerNrcPluginBuildMarker(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.__NRC_HEADLAMP_PLUGIN__ = { buildId: NRC_PLUGIN_BUILD_ID };
  console.debug(
    `[NRC Plugin] ${NRC_PLUGIN_BUILD_ID} — If Network still shows a failing single-item NRC list request, Headlamp is loading an OLD main.js from another plugins directory. Type window.__NRC_HEADLAMP_PLUGIN__ in the console to confirm this build.`
  );
}
