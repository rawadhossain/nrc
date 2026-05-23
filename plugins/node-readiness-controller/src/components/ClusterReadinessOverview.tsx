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

import { Loader, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { type ReactNode, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useNodeReadinessAPI } from '../hooks/useNodeReadinessAPI';
import { PLUGIN_ROUTE, PLUGIN_ROOT } from '../pluginRoutes';
import { shouldShowNrcLoading, shouldShowNotInstalledBanner } from '../nrcInstallGate';
import { NodeReadinessRule } from '../resources/nodeReadinessRule';
import { NotInstalled } from './NotInstalled';
import { RuleDetailNavLink } from './RuleDetailNavLink';
import { DryRunPreview } from './rules/DryRunPreview';

function blockedCount(rule: NodeReadinessRule): number {
  return (rule.status.nodeEvaluations ?? []).filter(e => e.taintStatus === 'Present').length;
}

function readyCount(rule: NodeReadinessRule): number {
  const ev = rule.status.nodeEvaluations ?? [];
  if (ev.length === 0) {
    return 0;
  }
  return ev.filter(e => e.taintStatus !== 'Present').length;
}

function taintDisplay(rule: NodeReadinessRule): string {
  const key = rule.taintKey;
  const value = rule.spec?.taint?.value;
  const effect = rule.taintEffect;
  if (!key) {
    return '—';
  }
  if (value !== undefined && value !== '') {
    return `${key}=${value}:${effect}`;
  }
  return `${key}:${effect}`;
}

/** Cluster URL segment before plugin routes, e.g. `/clusters/my-cluster` */
function clusterBaseBeforePlugin(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '');
  const marker = `${PLUGIN_ROOT}/`;
  const idx = normalized.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  return normalized.slice(0, idx);
}

function OverlineWithTooltip({ children, title }: { title: string; children: ReactNode }) {
  return (
    <Tooltip title={title}>
      <Typography
        color="text.secondary"
        component="span"
        display="block"
        sx={{ cursor: 'help', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}
        variant="overline"
      >
        {children}
      </Typography>
    </Tooltip>
  );
}

/** Shared stat card body: consistent height and padding for the nine overview metrics. */
const STAT_CARD_CONTENT_SX = {
  minHeight: 118,
  pt: 2,
  px: 2,
  pb: 2,
  '&:last-child': { pb: 2 },
} as const;

export function ClusterReadinessOverview() {
  const { recheckAvailability } = useNodeReadinessAPI();
  const history = useHistory();
  const { pathname } = useLocation();
  const [items, error] = NodeReadinessRule.useList({ refetchInterval: 30000 });

  const stats = useMemo(() => {
    if (!items) {
      return null;
    }
    const liveRules = items.filter(r => !r.dryRun);
    const dryRunRules = items.filter(r => r.dryRun);
    const liveRulesWithFailedNodes = liveRules.filter(r => r.failedNodeCount > 0).length;
    const failedEntriesLiveSum = liveRules.reduce((s, r) => s + r.failedNodeCount, 0);
    const evaluationsSum = items.reduce((s, r) => s + (r.status.nodeEvaluations?.length ?? 0), 0);
    const blockedLiveEvaluations = liveRules.reduce((s, r) => s + blockedCount(r), 0);
    const totalManagedNodes = liveRules.reduce((s, r) => s + (r.status.appliedNodes?.length ?? 0), 0);
    const nodesReady = Math.max(0, totalManagedNodes - blockedLiveEvaluations);

    const distinctFailedNodeNames = new Set<string>();
    for (const rule of items) {
      for (const f of rule.status.failedNodes ?? []) {
        if (f.nodeName) {
          distinctFailedNodeNames.add(f.nodeName);
        }
      }
    }
    const controllerErrorCount = distinctFailedNodeNames.size;

    const uniqueBlockedNodeNames = new Set<string>();
    for (const rule of liveRules) {
      for (const ev of rule.status.nodeEvaluations ?? []) {
        if (ev.taintStatus === 'Present' && ev.nodeName) {
          uniqueBlockedNodeNames.add(ev.nodeName);
        }
      }
    }
    const uniqueBlockedCount = uniqueBlockedNodeNames.size;

    return {
      totalManagedNodes,
      nodesReady,
      rulesTotal: items.length,
      liveCount: liveRules.length,
      dryRunCount: dryRunRules.length,
      liveRulesWithFailedNodes,
      failedEntriesLiveSum,
      evaluationsSum,
      blockedLiveEvaluations,
      controllerErrorCount,
      uniqueBlockedCount,
    };
  }, [items]);

  if (shouldShowNrcLoading(items, error)) {
    return (
      <SectionBox title="Cluster readiness overview">
        <Loader title="Loading NodeReadinessRules" />
      </SectionBox>
    );
  }

  if (shouldShowNotInstalledBanner(items, error)) {
    return (
      <SectionBox title="Cluster readiness overview">
        <NotInstalled isLoading={false} onRecheck={recheckAvailability} />
      </SectionBox>
    );
  }

  if (items === null) {
    return (
      <SectionBox title="Cluster readiness overview">
        <Loader title="Loading NodeReadinessRules" />
      </SectionBox>
    );
  }

  return (
    <SectionBox title="Cluster readiness overview">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message}
        </Alert>
      )}

      {stats && (
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              border: 1,
              borderStyle: 'solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Typography color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }} variant="subtitle2">
              Node health
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={6} md={4}>
                <Card variant="outlined" sx={{ borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <OverlineWithTooltip title="Sum across rules — nodes matching multiple rules are counted more than once">
                      Total managed nodes
                    </OverlineWithTooltip>
                    <Typography variant="h5">{stats.totalManagedNodes}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={4}>
                <Card
                  variant="outlined"
                  sx={theme => ({
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor:
                      stats.blockedLiveEvaluations > 0
                        ? theme.palette.warning.main
                        : theme.palette.success.main,
                    height: '100%',
                  })}
                >
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Nodes ready
                    </Typography>
                    <Typography variant="h5">{stats.nodesReady}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }} variant="caption">
                      ({stats.uniqueBlockedCount} unique node{stats.uniqueBlockedCount === 1 ? '' : 's'} blocked)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={4}>
                <Card
                  variant="outlined"
                  sx={theme => ({
                    borderWidth: stats.blockedLiveEvaluations > 0 ? 2 : 1,
                    borderStyle: 'solid',
                    borderColor:
                      stats.blockedLiveEvaluations > 0
                        ? theme.palette.warning.main
                        : theme.palette.divider,
                    height: '100%',
                  })}
                >
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Actively blocked evaluations (live rules)
                    </Typography>
                    <Typography
                      color={stats.blockedLiveEvaluations > 0 ? 'warning.main' : 'text.primary'}
                      variant="h5"
                    >
                      {stats.blockedLiveEvaluations}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              border: 1,
              borderStyle: 'solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Typography color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }} variant="subtitle2">
              Rules & evaluations
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Rules (total)
                    </Typography>
                    <Typography variant="h5">{stats.rulesTotal}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Live rules
                    </Typography>
                    <Typography variant="h5">{stats.liveCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Dry-run rules
                    </Typography>
                    <Typography variant="h5">{stats.dryRunCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Live rules with failed nodes
                    </Typography>
                    <Typography variant="h5">{stats.liveRulesWithFailedNodes}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Failed node entries (live rules, sum)
                    </Typography>
                    <Typography variant="h5">{stats.failedEntriesLiveSum}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card variant="outlined" sx={{ borderColor: 'divider', height: '100%' }}>
                  <CardContent sx={STAT_CARD_CONTENT_SX}>
                    <Typography color="text.secondary" variant="overline">
                      Node evaluations (sum)
                    </Typography>
                    <Typography variant="h5">{stats.evaluationsSum}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      )}

      {stats && stats.controllerErrorCount > 0 && (
        <Card
          component="div"
          role="button"
          tabIndex={0}
          variant="outlined"
          onClick={() => {
            const base = clusterBaseBeforePlugin(pathname);
            if (base !== null) {
              history.push(`${base}${PLUGIN_ROUTE.rulesList}`);
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const base = clusterBaseBeforePlugin(pathname);
              if (base !== null) {
                history.push(`${base}${PLUGIN_ROUTE.rulesList}`);
              }
            }
          }}
          sx={theme => ({
            mb: 2,
            cursor: 'pointer',
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: theme.palette.warning.main,
            '&:hover': { bgcolor: 'action.hover' },
          })}
        >
          <CardContent>
            <Typography color="warning.main" sx={{ fontWeight: 600 }} variant="subtitle1">
              Controller errors
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
              {stats.controllerErrorCount} distinct node{stats.controllerErrorCount === 1 ? '' : 's'} in{' '}
              <code>status.failedNodes</code> across rules. Open the Rules page for details.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Typography
        color="text.secondary"
        component="div"
        sx={{ mb: 2, maxWidth: 720, opacity: 0.88 }}
        variant="caption"
      >
        <strong>Node health</strong> uses live rules only: managed total is <code>∑ len(status.appliedNodes)</code> (same
        node under multiple rules is counted multiple times). <strong>Nodes ready</strong> subtracts evaluations with{' '}
        <code>taintStatus: Present</code>, matching Active blockers.
      </Typography>
      <Typography
        color="text.secondary"
        component="div"
        sx={{ mb: 2, maxWidth: 720, opacity: 0.88 }}
        variant="caption"
      >
        <strong>Rules &amp; evaluations</strong>: rule counts and evaluation sums include all rules. Failed-node and
        blocked-taint figures are live-only (<code>spec.dryRun: false</code>) — dry-run does not apply taints.
      </Typography>

      <Typography sx={{ mb: 2 }} variant="h6">
        Rules
      </Typography>

      <Grid container spacing={2}>
        {items.map(rule => {
          const b = blockedCount(rule);
          const r = readyCount(rule);
          const total = b + r || 1;
          const pct = Math.round((100 * r) / total);
          return (
            <Grid key={rule.getName()} item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography sx={{ mb: 1 }} variant="h6">
                    <RuleDetailNavLink rule={rule}>{rule.getName()}</RuleDetailNavLink>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    <Chip label={rule.enforcementMode} size="small" variant="outlined" />
                    {rule.dryRun && <Chip color="info" label="dry-run" size="small" variant="outlined" />}
                  </Box>
                  <Typography
                    sx={{ fontFamily: 'ui-monospace, monospace', mb: 1, wordBreak: 'break-all' }}
                    variant="body2"
                  >
                    {taintDisplay(rule)}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }} variant="body2">
                    Applied: {rule.appliedNodeCount} · Failed: {rule.failedNodeCount} · Evaluated:{' '}
                    {rule.evaluatedNodeCount}
                  </Typography>
                  {!rule.dryRun && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress sx={{ flex: 1, height: 8, borderRadius: 1 }} value={pct} variant="determinate" />
                      <Typography component="span" variant="body2" whiteSpace="nowrap">
                        {r}/{total} ready
                      </Typography>
                    </Box>
                  )}
                  {!rule.dryRun && rule.failedNodeCount > 0 && (
                    <Typography color="warning.main" sx={{ mt: 1 }} variant="body2">
                      {rule.failedNodeCount} failed-node entr{rule.failedNodeCount === 1 ? 'y' : 'ies'} in status
                    </Typography>
                  )}
                  <DryRunPreview dryRun={rule.dryRun} results={rule.status.dryRunResults} variant="overview" />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </SectionBox>
  );
}
