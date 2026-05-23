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

import { SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import type { NodeReadinessRuleSpec } from '../../types';

export function RuleConditionsTable({
  conditions,
}: {
  conditions: NodeReadinessRuleSpec['conditions'] | undefined;
}) {
  const columns = useMemo(
    () => [
      {
        label: 'Condition type',
        header: 'Condition type',
        gridTemplate: 'minmax(140px, 1.2fr)',
        sort: (
          a: { type: string; requiredStatus: string },
          b: { type: string; requiredStatus: string }
        ) => a.type.localeCompare(b.type),
        getter: (row: { type: string; requiredStatus: string }) => (
          <Typography component="span" sx={{ fontFamily: 'ui-monospace, monospace' }} variant="body2">
            {row.type}
          </Typography>
        ),
      },
      {
        label: 'Required status',
        header: 'Required status',
        gridTemplate: 'min-content',
        sort: (
          a: { type: string; requiredStatus: string },
          b: { type: string; requiredStatus: string }
        ) => a.requiredStatus.localeCompare(b.requiredStatus),
        getter: (row: { type: string; requiredStatus: string }) => row.requiredStatus,
      },
    ],
    []
  );

  const data = conditions ?? [];

  if (data.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        No <code>spec.conditions</code> entries on this rule.
      </Typography>
    );
  }

  return <SimpleTable columns={columns} data={data} defaultSortingColumn={1} />;
}
