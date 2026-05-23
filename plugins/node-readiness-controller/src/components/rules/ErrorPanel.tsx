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

import { DateLabel, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import type { NodeFailure } from '../../types';

function reasonChipColor(reason: string | undefined): 'default' | 'error' | 'warning' {
  const r = (reason ?? '').toLowerCase();
  if (r.includes('error') || r.includes('fail')) {
    return 'error';
  }
  if (r.includes('demo') || r.includes('inject')) {
    return 'warning';
  }
  return 'warning';
}

export function ErrorPanel({ failures }: { failures: NodeFailure[] }) {
  const data = failures ?? [];

  const columns = useMemo(
    () => [
      {
        label: 'Node',
        header: 'Node',
        gridTemplate: 'minmax(120px, 1fr)',
        sort: (a: NodeFailure, b: NodeFailure) => a.nodeName.localeCompare(b.nodeName),
        getter: (r: NodeFailure) => r.nodeName,
      },
      {
        label: 'Reason',
        header: 'Reason',
        gridTemplate: 'minmax(120px, 1fr)',
        sort: (a: NodeFailure, b: NodeFailure) => (a.reason ?? '').localeCompare(b.reason ?? ''),
        getter: (r: NodeFailure) => (
          <Chip color={reasonChipColor(r.reason)} label={r.reason ?? '—'} size="small" variant="outlined" />
        ),
      },
      {
        label: 'Message',
        header: 'Message',
        gridTemplate: 'minmax(180px, 2fr)',
        sort: (a: NodeFailure, b: NodeFailure) => (a.message ?? '').localeCompare(b.message ?? ''),
        getter: (r: NodeFailure) => (
          <Typography component="span" variant="body2">
            {r.message ?? '—'}
          </Typography>
        ),
      },
      {
        label: 'Last evaluation',
        header: 'Last evaluation',
        gridTemplate: 'min-content',
        sort: (a: NodeFailure, b: NodeFailure) => {
          const ta = a.lastEvaluationTime ? new Date(a.lastEvaluationTime).getTime() : 0;
          const tb = b.lastEvaluationTime ? new Date(b.lastEvaluationTime).getTime() : 0;
          return ta - tb;
        },
        getter: (r: NodeFailure) =>
          r.lastEvaluationTime ? <DateLabel date={r.lastEvaluationTime} format="mini" /> : '—',
      },
    ],
    []
  );

  if (data.length === 0) {
    return (
      <Box>
        <Alert severity="success" variant="outlined">
          <Typography sx={{ fontWeight: 600 }} variant="body2">
            No controller errors in status
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="caption">
            Rows here are <code>status.failedNodes</code> (evaluation / API errors from the controller). Nodes blocked by
            readiness (taints) appear under <strong>Node evaluations</strong>, not here.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }} variant="body2">
          Controller-reported failures
        </Typography>
        <Typography color="text.secondary" variant="caption">
          Distinct from readiness “blocked” nodes: these entries mean the controller recorded an error while processing a
          node (see reason / message).
        </Typography>
      </Alert>
      <SimpleTable columns={columns} data={data} defaultSortingColumn={1} />
    </Box>
  );
}
