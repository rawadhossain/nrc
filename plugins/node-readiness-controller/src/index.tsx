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
 * Import order matters for the UMD bundle: sidebar first, then each route
 * file with static page imports (no React.lazy / dynamic import — Rollup
 * inlines those into `then(() => Pe)` before `const Pe`, causing TDZ crashes).
 */
import './sidebarInstall';
import './routeOverview';
import './routeBlockers';
import './routeRules';
