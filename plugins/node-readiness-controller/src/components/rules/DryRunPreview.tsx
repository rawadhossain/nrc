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

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DryRunResults } from '../../types';

export type DryRunPreviewVariant = 'compact' | 'overview';

function statNum(n: number | undefined): string {
  return n === undefined || n === null ? '—' : String(n);
}

function hasMeaningfulDryRunResults(r: DryRunResults | undefined): boolean {
  if (!r) {
    return false;
  }
  if (r.summary != null && r.summary !== '') {
    return true;
  }
  return [r.affectedNodes, r.taintsToAdd, r.taintsToRemove, r.riskyOperations].some(v => v != null);
}

export function DryRunPreview({
  dryRun,
  results,
  variant = 'compact',
}: {
  dryRun: boolean;
  results?: DryRunResults;
  variant?: DryRunPreviewVariant;
}) {
  if (!dryRun) {
    return null;
  }

  if (!hasMeaningfulDryRunResults(results)) {
    return (
      <Alert severity="info" variant="outlined" sx={variant === 'overview' ? { mt: 1 } : undefined}>
        <Typography variant="body2">
          Dry run is enabled. Waiting for <code>status.dryRunResults</code> from the controller (reconcile in progress).
        </Typography>
      </Alert>
    );
  }

  const detailedStatsLine = (
    <Typography component="div" variant="body2">
      <strong>Affected nodes:</strong> {statNum(results.affectedNodes)} · <strong>Taints to add:</strong>{' '}
      {statNum(results.taintsToAdd)} · <strong>Taints to remove:</strong> {statNum(results.taintsToRemove)} ·{' '}
      <strong>Risky operations:</strong> {statNum(results.riskyOperations)}
    </Typography>
  );

  if (variant === 'overview') {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Alert severity="info" variant="outlined" icon={false} sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 600 }} variant="body2">
            DRY RUN MODE -- No changes are being applied
          </Typography>
        </Alert>
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Typography color="text.secondary" sx={{ mb: 1 }} variant="subtitle2">
            Aggregate impact (status.dryRunResults)
          </Typography>
          {detailedStatsLine}
          {results.summary && (
            <Typography sx={{ mt: 1 }} variant="body2">
              {results.summary}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  /* compact — rule detail only: AlertTitle + chips + highlighted summary */
  return (
    <Alert severity="info" variant="outlined">
      <AlertTitle>DRY RUN MODE -- No changes are being applied</AlertTitle>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
        <Chip label={`Affected: ${statNum(results.affectedNodes)}`} size="small" variant="outlined" />
        <Chip label={`Taints to add: ${statNum(results.taintsToAdd)}`} size="small" variant="outlined" />
        <Chip label={`Taints to remove: ${statNum(results.taintsToRemove)}`} size="small" variant="outlined" />
        <Chip label={`Risky: ${statNum(results.riskyOperations)}`} size="small" variant="outlined" />
      </Stack>
      {results.summary && (
        <Box sx={{ bgcolor: 'action.selected', borderRadius: 1, mt: 1.5, px: 1.5, py: 1 }}>
          <Typography sx={{ fontWeight: 700 }} variant="body2">
            {results.summary}
          </Typography>
        </Box>
      )}
    </Alert>
  );
}
