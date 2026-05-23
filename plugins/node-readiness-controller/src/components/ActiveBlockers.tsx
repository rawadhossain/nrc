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
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import {
  type ActiveBlockerRow,
  buildActiveBlockerRows,
  formatDurationMinutes,
  rowMatchesFilter,
  STUCK_THRESHOLD_MINUTES,
} from '../activeBlockersRows';
import { useNodeReadinessAPI } from '../hooks/useNodeReadinessAPI';
import { shouldShowNrcLoading, shouldShowNotInstalledBanner } from '../nrcInstallGate';
import { NodeReadinessRule } from '../resources/nodeReadinessRule';
import { NotInstalled } from './NotInstalled';

export function ActiveBlockers() {
  const { recheckAvailability } = useNodeReadinessAPI();
  const [items, error] = NodeReadinessRule.useList({ refetchInterval: 30000 });
  const [filterText, setFilterText] = useState('');

  const allRows = useMemo(() => (items ? buildActiveBlockerRows(items) : []), [items]);

  const filteredRows = useMemo(() => {
    return allRows.filter(r => rowMatchesFilter(r, filterText));
  }, [allRows, filterText]);

  const columns = useMemo(
    () => [
      {
        label: 'Node',
        header: 'Node',
        gridTemplate: 'minmax(120px, 1.2fr)',
        sort: (a: ActiveBlockerRow, b: ActiveBlockerRow) => a.nodeName.localeCompare(b.nodeName),
        getter: (r: ActiveBlockerRow) => (
          <Typography component="span" variant="body2">
            {r.nodeName}
          </Typography>
        ),
      },
      {
        label: 'Blocking condition',
        header: 'Blocking condition',
        gridTemplate: 'minmax(180px, 2fr)',
        sort: (a: ActiveBlockerRow, b: ActiveBlockerRow) =>
          a.blockingCondition.localeCompare(b.blockingCondition),
        getter: (r: ActiveBlockerRow) => (
          <Typography component="span" variant="body2">
            {r.blockingCondition}
          </Typography>
        ),
      },
      {
        label: 'Rule',
        header: 'Rule',
        gridTemplate: 'minmax(100px, 1fr)',
        sort: (a: ActiveBlockerRow, b: ActiveBlockerRow) => a.ruleName.localeCompare(b.ruleName),
        getter: (r: ActiveBlockerRow) => r.ruleName,
      },
      {
        label: 'Last evaluated',
        header: 'Last evaluated',
        gridTemplate: 'minmax(100px, 1fr)',
        sort: (a: ActiveBlockerRow, b: ActiveBlockerRow) => {
          const ta = a.lastEvaluationTime ? new Date(a.lastEvaluationTime).getTime() : 0;
          const tb = b.lastEvaluationTime ? new Date(b.lastEvaluationTime).getTime() : 0;
          return ta - tb;
        },
        getter: (r: ActiveBlockerRow) =>
          r.lastEvaluationTime ? (
            <DateLabel date={r.lastEvaluationTime} format="mini" />
          ) : (
            '—'
          ),
      },
      {
        label: '~Time in state',
        header: '~Time in state',
        gridTemplate: 'min-content',
        sort: (a: ActiveBlockerRow, b: ActiveBlockerRow) => {
          const ma = a.minutesInStateMax ?? -1;
          const mb = b.minutesInStateMax ?? -1;
          return ma - mb;
        },
        getter: (r: ActiveBlockerRow) => formatDurationMinutes(r.minutesInStateMax),
      },
      {
        label: 'Status',
        header: 'Status',
        gridTemplate: 'min-content',
        sort: (a: ActiveBlockerRow, b: ActiveBlockerRow) => Number(a.stuck) - Number(b.stuck),
        getter: (r: ActiveBlockerRow) =>
          r.stuck ? (
            <Tooltip
              title={
                <>
                  Heuristic: minutes since last rule evaluation for this node (
                  <code>status.nodeEvaluations[].lastEvaluationTime</code>) ≥ {STUCK_THRESHOLD_MINUTES}m. The CRD does
                  not expose a dedicated &quot;time in blocked state&quot; field; see{' '}
                  <a
                    href="https://github.com/kubernetes-sigs/node-readiness-controller/issues/182"
                    rel="noreferrer"
                    target="_blank"
                  >
                    kubernetes-sigs/node-readiness-controller#182
                  </a>{' '}
                  for API ergonomics discussion.
                </>
              }
            >
              <Chip aria-label="Stuck heuristic" color="error" label="Stuck" size="small" variant="outlined" />
            </Tooltip>
          ) : (
            <Chip label="Active" size="small" variant="outlined" />
          ),
      },
    ],
    []
  );

  if (shouldShowNrcLoading(items, error)) {
    return (
      <SectionBox title="Active blockers">
        <Loader title="Loading NodeReadinessRules" />
      </SectionBox>
    );
  }

  if (shouldShowNotInstalledBanner(items, error)) {
    return (
      <SectionBox title="Active blockers">
        <NotInstalled isLoading={false} onRecheck={recheckAvailability} />
      </SectionBox>
    );
  }

  if (items === null) {
    return (
      <SectionBox title="Active blockers">
        <Loader title="Loading NodeReadinessRules" />
      </SectionBox>
    );
  }

  return (
    <SectionBox title="Active blockers">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error)?.message ?? 'Failed to load NodeReadinessRules'}
        </Alert>
      )}

      <Box alignItems="flex-start" display="flex" gap={0.5} sx={{ mb: 2 }}>
        <Typography color="text.secondary" component="div" variant="body2">
          Nodes with taint <strong>Present</strong> on <strong>live</strong> rules (
          <code>spec.dryRun: false</code>). Rows expand one line per blocking condition.{' '}
          <strong>Stuck</strong> if approximate time since last evaluation is ≥{' '}
          <strong>{STUCK_THRESHOLD_MINUTES} minutes</strong>. Data refreshes every 30s.
        </Typography>
        <Tooltip
          title={
            <>
              Stuck is inferred from evaluation recency, not condition transition times. For surfacing duration in the
              API, see{' '}
              <a
                href="https://github.com/kubernetes-sigs/node-readiness-controller/issues/182"
                rel="noreferrer"
                target="_blank"
              >
                #182
              </a>
              .
            </>
          }
        >
          <Typography
            aria-label="About the stuck node heuristic"
            color="primary"
            component="span"
            sx={{ cursor: 'help', flexShrink: 0, textDecoration: 'underline dotted', mt: 0.25 }}
            variant="caption"
          >
            About stuck
          </Typography>
        </Tooltip>
      </Box>

      <TextField
        fullWidth
        label="Filter"
        margin="normal"
        placeholder="Node, rule, or condition text"
        size="small"
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
        sx={{ mb: 2, mt: 0 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Typography color="text.secondary" variant="caption">
                {filteredRows.length}/{allRows.length}
              </Typography>
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ mt: 1 }}>
        {allRows.length === 0 ? (
          <Alert severity="success" variant="outlined">
            No active blockers: no live rule has evaluations with taint status Present.
          </Alert>
        ) : filteredRows.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No rows match the current filter.
          </Typography>
        ) : (
          <SimpleTable columns={columns} data={filteredRows} defaultSortingColumn={1} />
        )}
      </Box>
    </SectionBox>
  );
}
