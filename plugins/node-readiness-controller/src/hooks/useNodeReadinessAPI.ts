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

import { useCallback } from 'react';

/**
 * "Check again" for the not-installed banner. Full page reload refreshes list queries.
 * We do not run a separate install probe with fetch() — in Headlamp Desktop that can resolve
 * to file:///… and break; availability comes only from NodeReadinessRule.useList().
 */
export function useNodeReadinessAPI() {
  const recheckAvailability = useCallback(() => {
    window.location.reload();
  }, []);

  return { recheckAvailability };
}
