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

# Apply mixed node status.conditions *after* NodeReadinessRules and KWOK Node objects exist.
# Run from repo root or this directory (uses kubectl context only).
set -euo pipefail

TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

patch_two() {
  local name="$1"
  local ctype="$2"
  local cstat="$3"
  kubectl patch node "${name}" --subresource=status --type=merge -p "$(cat <<EOF
{"status":{"conditions":[
  {"type":"Ready","status":"True","lastHeartbeatTime":"${TS}","lastTransitionTime":"${TS}","reason":"KubeletReady","message":"kwok"},
  {"type":"${ctype}","status":"${cstat}","lastHeartbeatTime":"${TS}","lastTransitionTime":"${TS}","reason":"DemoPatch","message":"nrr-poc"}
]}}
EOF
)"
}

patch_ready_only() {
  local name="$1"
  kubectl patch node "${name}" --subresource=status --type=merge -p "$(cat <<EOF
{"status":{"conditions":[
  {"type":"Ready","status":"True","lastHeartbeatTime":"${TS}","lastTransitionTime":"${TS}","reason":"KubeletReady","message":"kwok"}
]}}
EOF
)"
}

echo "Patching KWOK node conditions (demo mix: passing, blocked, missing condition => Unknown)..."

# GPU rule nodes (5)
patch_two kwok-demo-gpu-0 GPUDriverLoaded True
patch_two kwok-demo-gpu-1 GPUDriverLoaded True
patch_two kwok-demo-gpu-2 GPUDriverLoaded False
patch_two kwok-demo-gpu-3 GPUDriverLoaded False
patch_ready_only kwok-demo-gpu-4

# CNI rule nodes (5)
patch_two kwok-demo-cni-0 CNIReady True
patch_two kwok-demo-cni-1 CNIReady True
patch_two kwok-demo-cni-2 CNIReady False
patch_ready_only kwok-demo-cni-3
patch_two kwok-demo-cni-4 CNIReady False

# Storage rule nodes (5)
patch_two kwok-demo-storage-0 StorageReady True
patch_two kwok-demo-storage-1 StorageReady True
patch_two kwok-demo-storage-2 StorageReady True
patch_two kwok-demo-storage-3 StorageReady False
patch_two kwok-demo-storage-4 StorageReady False

# Fabric dry-run rule nodes (5) — dry-run does not add taints; still affects dryRunResults
patch_two kwok-demo-dryrun-0 FabricReady True
patch_two kwok-demo-dryrun-1 FabricReady True
patch_two kwok-demo-dryrun-2 FabricReady False
patch_two kwok-demo-dryrun-3 FabricReady False
patch_two kwok-demo-dryrun-4 FabricReady False

echo "Done. Reconcile may take a few seconds; check: kubectl get nrr -o wide"
