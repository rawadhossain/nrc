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

import { DateLabel, DetailsGrid, Loader, SectionBox, SectionHeader, SimpleTable } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useMemo, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useNodeReadinessAPI } from '../hooks/useNodeReadinessAPI';
import { NodeReadinessRule } from '../resources/nodeReadinessRule';
import { shouldShowNrcLoading, shouldShowNotInstalledBanner } from '../nrcInstallGate';
import type { NodeEvaluation } from '../types';
import { NodeDetailNavLink } from './NodeDetailNavLink';
import { NotInstalled } from './NotInstalled';
import { DryRunPreview } from './rules/DryRunPreview';
import { ErrorPanel } from './rules/ErrorPanel';
import { RuleConditionsTable } from './rules/RuleConditionsTable';

function formatNodeSelector(sel: Record<string, unknown> | undefined): string {
  if (!sel || Object.keys(sel).length === 0) {
    return '—';
  }
  return Object.entries(sel)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');
}

function taintDisplayLine(item: NodeReadinessRule): string {
  const k = item.taintKey;
  const v = item.spec?.taint?.value;
  const eff = item.taintEffect;
  if (!k) {
    return '—';
  }
  if (v !== undefined && v !== '') {
    return `${k}=${v}:${eff}`;
  }
  return `${k}:${eff}`;
}

export function RuleDetail() {
  const { name } = useParams<{ name: string }>();
  const { recheckAvailability } = useNodeReadinessAPI();
  const [listItems, listError] = NodeReadinessRule.useList({ refetchInterval: 30000 });

  const evalColumns = useMemo(
    () => [
      {
        label: 'Node',
        header: 'Node',
        gridTemplate: 'minmax(120px, 1fr)',
        sort: (a: NodeEvaluation, b: NodeEvaluation) => a.nodeName.localeCompare(b.nodeName),
        getter: (row: NodeEvaluation) => (
          <Typography component="span" variant="body2">
            <NodeDetailNavLink nodeName={row.nodeName}>{row.nodeName}</NodeDetailNavLink>
          </Typography>
        ),
      },
      {
        label: 'Taint',
        header: 'Taint',
        gridTemplate: 'min-content',
        sort: (a: NodeEvaluation, b: NodeEvaluation) => a.taintStatus.localeCompare(b.taintStatus),
        getter: (row: NodeEvaluation) => (
          <Chip
            color={row.taintStatus === 'Present' ? 'error' : 'success'}
            label={row.taintStatus}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        label: 'Last evaluated',
        header: 'Last evaluated',
        gridTemplate: 'min-content',
        sort: (a: NodeEvaluation, b: NodeEvaluation) => {
          const ta = a.lastEvaluationTime ? new Date(a.lastEvaluationTime).getTime() : 0;
          const tb = b.lastEvaluationTime ? new Date(b.lastEvaluationTime).getTime() : 0;
          return ta - tb;
        },
        getter: (row: NodeEvaluation) =>
          row.lastEvaluationTime ? <DateLabel date={row.lastEvaluationTime} format="mini" /> : '—',
      },
      {
        label: 'Conditions',
        header: 'Conditions',
        gridTemplate: 'minmax(200px, 2fr)',
        sort: (a: NodeEvaluation, b: NodeEvaluation) => {
          const sa = (a.conditionResults ?? []).map(c => c.type).join(',');
          const sb = (b.conditionResults ?? []).map(c => c.type).join(',');
          return sa.localeCompare(sb);
        },
        getter: (row: NodeEvaluation) => {
          const results = row.conditionResults ?? [];
          if (results.length === 0) {
            return '—';
          }
          return (
            <Typography component="span" variant="body2">
              {results.map(c => `${c.type}: ${c.currentStatus} (required ${c.requiredStatus})`).join(' · ')}
            </Typography>
          );
        },
      },
    ],
    []
  );

  if (shouldShowNrcLoading(listItems, listError)) {
    return (
      <SectionBox title="Node readiness rule">
        <Loader title="Loading NodeReadinessRules" />
      </SectionBox>
    );
  }

  if (shouldShowNotInstalledBanner(listItems, listError)) {
    return <NotInstalled isLoading={false} onRecheck={recheckAvailability} />;
  }

  return (
    <DetailsGrid
      resourceType={NodeReadinessRule}
      name={name}
      extraInfo={item =>
        item
          ? [
              { name: 'Mode', value: item.enforcementMode },
              { name: 'Dry run', value: item.dryRun ? 'true' : 'false' },
              { name: 'Taint', value: taintDisplayLine(item) },
              { name: 'Node selector', value: formatNodeSelector(item.spec?.nodeSelector) },
            ]
          : []
      }
      extraSections={item => {
        if (!item) {
          return [];
        }

        const evals = item.status.nodeEvaluations ?? [];
        const dry = item.dryRun;
        const dryResults = item.status.dryRunResults;
        const affectedHint =
          dryResults?.affectedNodes != null ? `Nodes in scope (aggregate): ${dryResults.affectedNodes}` : null;

        const sections: Array<{ id: string; section: ReactNode }> = [];

        sections.push({
          id: 'conditions-spec',
          section: (
            <SectionBox title="Conditions checked (spec)">
              <RuleConditionsTable conditions={item.spec?.conditions} />
            </SectionBox>
          ),
        });

        if (dry) {
          sections.push({
            id: 'dry-run',
            section: (
              <SectionBox title="Dry run preview">
                <DryRunPreview dryRun={dry} results={dryResults} variant="compact" />
                <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 720, opacity: 0.88 }} variant="caption">
                  Per-node evaluations are not written to <code>status.nodeEvaluations</code> while <code>spec.dryRun</code>{' '}
                  is true; the controller only publishes aggregate counters above.
                </Typography>
              </SectionBox>
            ),
          });
        }

        sections.push({
          id: 'evaluations',
          section: (
            <SectionBox title="Node evaluations">
              {dry ? (
                <Box
                  sx={{
                    py: 2,
                    px: 2,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography color="text.secondary" sx={{ opacity: 0.9 }} variant="caption">
                    No per-node evaluation rows for dry-run rules (expected). Use <strong>Dry run preview</strong> for
                    scope{affectedHint ? ` (${affectedHint})` : ''}.
                  </Typography>
                </Box>
              ) : evals.length === 0 ? (
                <Box
                  sx={{
                    py: 2,
                    px: 2,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography color="text.secondary" sx={{ opacity: 0.9 }} variant="caption">
                    No evaluations in <code>status</code> yet. If the rule just applied, wait for the controller to
                    reconcile; then refresh.
                  </Typography>
                </Box>
              ) : (
                <SimpleTable columns={evalColumns} data={evals} defaultSortingColumn={1} />
              )}
            </SectionBox>
          ),
        });

        const failedNodes = item.status.failedNodes ?? [];
        const failedNodesTitle = (
          <SectionHeader
            headerStyle="subsection"
            title="Failed nodes (controller errors)"
            titleSideActions={
              failedNodes.length === 0
                ? [<Chip key="healthy" color="success" label="Healthy" size="small" variant="outlined" />]
                : []
            }
          />
        );

        sections.push({
          id: 'errors',
          section: (
            <SectionBox title={failedNodesTitle}>
              <ErrorPanel failures={failedNodes} />
            </SectionBox>
          ),
        });

        return sections;
      }}
    />
  );
}
