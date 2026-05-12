#!/usr/bin/env bash
# Copyright The Kubernetes Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Phase 8: drive a mixed demo for Headlamp + Grafana after base PoC is deployed.
#
# Design notes (vs generic "AI" demo scripts):
# - fake-rules.yaml rules watch ONLY: GPUDriverLoaded (gpu), CNIReady (cni),
#   StorageReady (storage), FabricReady (dry-run only). Extra condition types
#   on nodes do not affect those rules unless you extend the CRs.
# - Headlamp "stuck" uses status.nodeEvaluations[].lastEvaluationTime, not
#   node condition lastTransitionTime — we optionally patch evaluation time
#   (needs jq) to light up the stuck chip reliably (UI threshold is 10 minutes;
#   demo uses 15 minutes ago so the row stays Stuck after refresh jitter).
# - Taint metrics: condition cycles (pass → fail) trigger controller remove +
#   add taint without requiring jq.
#
# Usage:
#   ./hack/dev-setup/demo-data.sh
#   ./hack/dev-setup/demo-data.sh --reset    # all demo nodes → passing (per rule)
#   SKIP_PATCH_CONDITIONS=1 ./hack/dev-setup/demo-data.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV_SETUP="${ROOT}/hack/dev-setup"
MODE="${1:-}"

if ! kubectl get crd nodereadinessrules.readiness.node.x-k8s.io &>/dev/null; then
  echo "ERROR: NodeReadinessRule CRD not found. Deploy NRC (e.g. ./hack/dev-setup/setup.sh) first." >&2
  exit 1
fi

# Merge-patch Ready + one rule condition (same pattern as patch-conditions.sh).
patch_node_rule_condition() {
  local name="$1"
  local ctype="$2"
  local cstat="$3"
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  kubectl patch node "${name}" --subresource=status --type=merge -p "$(cat <<EOF
{"status":{"conditions":[
  {"type":"Ready","status":"True","lastHeartbeatTime":"${ts}","lastTransitionTime":"${ts}","reason":"KubeletReady","message":"kwok"},
  {"type":"${ctype}","status":"${cstat}","lastHeartbeatTime":"${ts}","lastTransitionTime":"${ts}","reason":"DemoPatch","message":"nrr-poc demo-data"}
]}}
EOF
)"
}

# --- Reset: every demo node fully passing for its ruleset (matches fake-rules.yaml). ---

if [[ "${MODE}" == "--reset" ]]; then
  echo "==> demo-data --reset: setting all KWOK demo nodes to passing rule conditions"
  for n in kwok-demo-gpu-{0..4}; do
    patch_node_rule_condition "${n}" GPUDriverLoaded True
  done
  for n in kwok-demo-cni-{0..4}; do
    patch_node_rule_condition "${n}" CNIReady True
  done
  for n in kwok-demo-storage-{0..4}; do
    patch_node_rule_condition "${n}" StorageReady True
  done
  for n in kwok-demo-dryrun-{0..4}; do
    patch_node_rule_condition "${n}" FabricReady True
  done
  echo "==> Clearing synthetic cni-rule status.failedNodes from demo inject (if present)"
  kubectl patch nodereadinessrule cni-rule --subresource=status --type=merge -p '{"status":{"failedNodes":[]}}' \
    || echo "WARN: could not clear cni-rule failedNodes (ignore if rule missing)" >&2
  echo "Done. Re-run ./hack/dev-setup/demo-data.sh (no args) for mixed demo state."
  exit 0
fi

if [[ -n "${MODE}" ]]; then
  echo "ERROR: unknown argument '${MODE}' (use --reset or no args)" >&2
  exit 1
fi

if [[ "${SKIP_PATCH_CONDITIONS:-}" == "1" ]]; then
  echo "SKIP_PATCH_CONDITIONS=1: skipping ${DEV_SETUP}/patch-conditions.sh"
else
  bash "${DEV_SETUP}/patch-conditions.sh"
fi

echo "==> Waiting for reconciles (conditions + taints)..."
sleep "${DEMO_RECONCILE_WAIT:-18}"

# Old condition transition on storage (visual only in node raw YAML; does not drive Headlamp stuck chip).
patch_stuck_condition_age() {
  local name="$1"
  local ctype="$2"
  local old_ts
  local now_ts
  now_ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  if ! old_ts="$(date -u -d '25 minutes ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)"; then
    old_ts="$(date -u -v-25M +"%Y-%m-%dT%H:%M:%SZ")"
  fi
  kubectl patch node "${name}" --subresource=status --type=merge -p "$(cat <<EOF
{"status":{"conditions":[
  {"type":"Ready","status":"True","lastHeartbeatTime":"${now_ts}","lastTransitionTime":"${now_ts}","reason":"KubeletReady","message":"kwok"},
  {"type":"${ctype}","status":"False","lastHeartbeatTime":"${old_ts}","lastTransitionTime":"${old_ts}","reason":"StuckDemo","message":"nrr-poc demo-data (old transition time)"}
]}}
EOF
)"
}

echo "==> Demo: blocked storage node with aged condition timestamps — kwok-demo-storage-3"
patch_stuck_condition_age kwok-demo-storage-3 StorageReady

# Synthetic failedNodes for ErrorPanel (may be merged/overwritten by controller like any status).
eval_ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "==> Demo: synthetic status.failedNodes on cni-rule"
kubectl patch nodereadinessrule cni-rule --subresource=status --type=merge -p "$(cat <<EOF
{"status":{"failedNodes":[{"nodeName":"kwok-demo-cni-2","reason":"DemoInjected","message":"Synthetic failedNodes entry for Headlamp demo (not a live EvaluationError).","lastEvaluationTime":"${eval_ts}"}]}}
EOF
)" || echo "WARN: could not patch cni-rule status" >&2

# Headlamp stuck chip: minutes since nodeEvaluations[].lastEvaluationTime
patch_stuck_eval_time_if_possible() {
  local rule="$1"
  local nodename="$2"
  local minutes_ago="${3:-15}"
  if ! command -v jq &>/dev/null; then
    echo "    (jq not installed — skip stuck-eval patch; install jq to highlight Stuck in Active blockers)"
    return 0
  fi
  local old_iso
  if ! old_iso="$(date -u -d "${minutes_ago} minutes ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)"; then
    old_iso="$(date -u -v-"${minutes_ago}"M +"%Y-%m-%dT%H:%M:%SZ")"
  fi
  local idx
  idx="$(kubectl get nodereadinessrule "${rule}" -o json 2>/dev/null | jq -r --arg n "$nodename" \
    '.status.nodeEvaluations // [] | to_entries | map(select(.value.nodeName == $n)) | .[0].key // empty')"
  if [[ -z "${idx}" ]]; then
    echo "    (no evaluation for ${nodename} on ${rule} yet — skip stuck-eval)"
    return 0
  fi
  kubectl patch nodereadinessrule "${rule}" --subresource=status --type=json \
    -p="[{\"op\":\"replace\",\"path\":\"/status/nodeEvaluations/${idx}/lastEvaluationTime\",\"value\":\"${old_iso}\"}]" \
    && echo "    Patched ${rule} evaluation ${nodename} lastEvaluationTime → ${old_iso} (stuck heuristic)" \
    || echo "WARN: stuck-eval patch failed for ${rule}/${nodename}" >&2
}

echo "==> Demo: old lastEvaluationTime on a blocked node (Headlamp Active blockers → Stuck)"
patch_stuck_eval_time_if_possible cni-rule kwok-demo-cni-2 15

# Taint metrics: pass → fail cycles (remove taint when passing, add when failing again).
echo "==> Demo: condition cycles for node_readiness_taint_operations (gpu-2, cni-2)"
patch_node_rule_condition kwok-demo-gpu-2 GPUDriverLoaded True
sleep "${DEMO_CYCLE_WAIT:-10}"
patch_node_rule_condition kwok-demo-gpu-2 GPUDriverLoaded False

patch_node_rule_condition kwok-demo-cni-2 CNIReady True
sleep "${DEMO_CYCLE_WAIT:-10}"
patch_node_rule_condition kwok-demo-cni-2 CNIReady False

sleep "${DEMO_FINAL_WAIT:-8}"

echo ""
echo "Demo-data applied."
echo "  Headlamp: Overview, Rules, Active blockers (Stuck needs jq + patch above), Rule detail."
echo "  Grafana:  node_readiness_taint_operations_total after gpu/cni cycles."
echo "  Reset:    $0 --reset"
echo "Optional: kubectl get nrr -o wide"
