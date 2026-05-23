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

import { DateLabel, Loader, SectionBox, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Alert from '@mui/material/Alert';
import { useMemo } from 'react';
import { useNodeReadinessAPI } from '../hooks/useNodeReadinessAPI';
import { shouldShowNrcLoading, shouldShowNotInstalledBanner } from '../nrcInstallGate';
import { NodeReadinessRule } from '../resources/nodeReadinessRule';
import { NotInstalled } from './NotInstalled';
import { RuleDetailNavLink } from './RuleDetailNavLink';

export function RuleList() {
  const { recheckAvailability } = useNodeReadinessAPI();
  const [items, error] = NodeReadinessRule.useList({
    refetchInterval: 30000,
  });

  const columns = useMemo(
    () => [
      {
        label: 'Name',
        header: 'Name',
        gridTemplate: 'minmax(140px, 2fr)',
        sort: (a: NodeReadinessRule, b: NodeReadinessRule) =>
          a.getName().localeCompare(b.getName(), undefined, { sensitivity: 'base' }),
        getter: (r: NodeReadinessRule) => (
          <RuleDetailNavLink rule={r}>{r.getName()}</RuleDetailNavLink>
        ),
      },
      {
        label: 'Mode',
        header: 'Mode',
        gridTemplate: 'auto',
        sort: true,
        getter: (r: NodeReadinessRule) => r.enforcementMode,
      },
      {
        label: 'Taint',
        header: 'Taint',
        gridTemplate: 'minmax(100px, 1.5fr)',
        sort: true,
        getter: (r: NodeReadinessRule) => r.taintKey,
      },
      {
        label: 'Effect',
        header: 'Effect',
        gridTemplate: 'auto',
        sort: true,
        getter: (r: NodeReadinessRule) => r.taintEffect,
      },
      {
        label: 'Dry run',
        header: 'Dry run',
        gridTemplate: 'auto',
        sort: true,
        getter: (r: NodeReadinessRule) => (r.dryRun ? 'true' : 'false'),
      },
      {
        label: 'Applied',
        header: 'Applied',
        gridTemplate: 'min-content',
        sort: true,
        getter: (r: NodeReadinessRule) => r.appliedNodeCount,
      },
      {
        label: 'Failed',
        header: 'Failed',
        gridTemplate: 'min-content',
        sort: true,
        getter: (r: NodeReadinessRule) => r.failedNodeCount,
      },
      {
        label: 'Age',
        header: 'Age',
        gridTemplate: 'min-content',
        sort: (a: NodeReadinessRule, b: NodeReadinessRule) =>
          new Date(b.metadata.creationTimestamp ?? 0).getTime() -
          new Date(a.metadata.creationTimestamp ?? 0).getTime(),
        getter: (r: NodeReadinessRule) => (
          <DateLabel date={r.metadata.creationTimestamp} format="mini" />
        ),
      },
    ],
    []
  );

  if (shouldShowNrcLoading(items, error)) {
    return (
      <SectionBox title="NodeReadinessRules">
        <Loader title="Loading NodeReadinessRules" />
      </SectionBox>
    );
  }

  if (shouldShowNotInstalledBanner(items, error)) {
    return (
      <SectionBox title="NodeReadinessRules">
        <NotInstalled isLoading={false} onRecheck={recheckAvailability} />
      </SectionBox>
    );
  }

  if (items === null) {
    return (
      <SectionBox title="NodeReadinessRules">
        <Loader title="Loading NodeReadinessRules" />
      </SectionBox>
    );
  }

  return (
    <SectionBox title="NodeReadinessRules">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error)?.message ?? 'Failed to load NodeReadinessRules'}
        </Alert>
      )}
      {items.length === 0 ? (
        <Alert severity="info" variant="outlined">
          No NodeReadinessRules found. Install CRDs and apply rules (for example{' '}
          <code>hack/dev-setup/fake-rules.yaml</code> from this repo).
        </Alert>
      ) : (
        <SimpleTable columns={columns} data={items} defaultSortingColumn={1} />
      )}
    </SectionBox>
  );
}
