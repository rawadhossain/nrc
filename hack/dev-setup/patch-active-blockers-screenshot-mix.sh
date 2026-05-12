#!/usr/bin/env bash
# Mix "Stuck" vs non-stuck rows in Headlamp Active blockers for demos/screenshots.
#
# The UI marks Stuck when minutes since status.nodeEvaluations[].lastEvaluationTime >= 10
# (see plugins/node-readiness-controller/src/activeBlockersRows.ts).
#
# Requires: kubectl, jq. Run after demo rules + blocked nodes exist (e.g. demo-data.sh).
set -euo pipefail

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl not found" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (sudo apt install jq)" >&2
  exit 1
fi

now_iso="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
old_iso=""
if old_iso="$(date -u -d "15 minutes ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)"; then
  :
else
  old_iso="$(date -u -v-15M +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || true)"
fi
if [[ -z "${old_iso}" ]]; then
  echo "Could not compute '15 minutes ago' timestamp (date(1) unsupported flags?)" >&2
  exit 1
fi

blocked_json="$(kubectl get nodereadinessrule -o json | jq '[.items[]
  | select((.spec.dryRun // false) != true)
  | .metadata.name as $r
  | (.status.nodeEvaluations // []) | to_entries[]
  | select(.value.taintStatus == "Present")
  | {rule: $r, idx: .key, node: .value.nodeName}]
  | unique_by("\(.rule)|\(.node)")')"

count="$(echo "${blocked_json}" | jq 'length')"
if [[ "${count}" -lt 2 ]]; then
  echo "Need at least 2 blocked (taint present) evaluations; found ${count}."
  echo "Run: ./hack/dev-setup/demo-data.sh  (or ensure patch-conditions.sh left failing nodes), then retry."
  exit 1
fi

patch_time() {
  local rule="$1"
  local idx="$2"
  local iso="$3"
  local note="$4"
  kubectl patch nodereadinessrule "${rule}" --subresource=status --type=json \
    -p="[{\"op\":\"replace\",\"path\":\"/status/nodeEvaluations/${idx}/lastEvaluationTime\",\"value\":\"${iso}\"}]" \
    && echo "  OK ${note}: ${rule} / index ${idx} → ${iso}"
}

r0="$(echo "${blocked_json}" | jq -r '.[0].rule')"
i0="$(echo "${blocked_json}" | jq -r '.[0].idx')"
n0="$(echo "${blocked_json}" | jq -r '.[0].node')"
r1="$(echo "${blocked_json}" | jq -r '.[1].rule')"
i1="$(echo "${blocked_json}" | jq -r '.[1].idx')"
n1="$(echo "${blocked_json}" | jq -r '.[1].node')"

echo "==> Active blockers screenshot mix (controller may overwrite times on next reconcile)"
echo "    Fresh (not Stuck): ${r0} @ ${n0}"
patch_time "${r0}" "${i0}" "${now_iso}" "fresh ~0m"
echo "    Stuck (≥10m):     ${r1} @ ${n1}"
patch_time "${r1}" "${i1}" "${old_iso}" "old ~15m"
echo ""
echo "Open Headlamp → Node readiness → Active blockers and refresh."
echo "Tip: take screenshots soon; NRC reconcile may refresh lastEvaluationTime."
