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

# Optional Phase 8 wrapper: full PoC setup + demo data (this repo uses nrr-system, svc/prometheus).
#
# Usage (from repo root):
#   chmod +x hack/dev-setup/demo.sh
#   ./hack/dev-setup/demo.sh
#
#   ./hack/dev-setup/demo.sh --data-only   # same as SKIP_SETUP=1
#   ./hack/dev-setup/demo.sh --reset        # forward to demo-data.sh --reset
#
# Reuse an existing Kind cluster:
#   SKIP_CREATE_CLUSTER=1 ./hack/dev-setup/demo.sh
#
# Only refresh demo (cluster already provisioned):
#   SKIP_SETUP=1 ./hack/dev-setup/demo.sh
#   ./hack/dev-setup/demo.sh --data-only

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV="${ROOT}/hack/dev-setup"
MODE="${1:-}"

if [[ "${MODE}" == "--reset" ]]; then
  bash "${DEV}/demo-data.sh" --reset
  exit 0
fi

if [[ "${MODE}" == "--data-only" ]]; then
  export SKIP_SETUP=1
fi

if [[ -n "${MODE}" && "${MODE}" != "--data-only" ]]; then
  echo "ERROR: unknown argument '${MODE}' (use --reset, --data-only, or no args)" >&2
  exit 1
fi

if [[ "${SKIP_SETUP:-}" == "1" ]]; then
  echo "SKIP_SETUP=1: skipping hack/dev-setup/setup.sh"
else
  bash "${DEV}/setup.sh"
fi

bash "${DEV}/demo-data.sh"

echo ""
echo "Next:"
echo "  Headlamp → Node readiness → Overview, Rules, Active blockers, Rule detail"
echo "  kubectl -n nrr-system get deploy,po"
echo "  kubectl -n monitoring port-forward svc/prometheus 9090:9090"
echo "  kubectl -n monitoring port-forward svc/grafana 3000:3000"
echo "  Import Grafana dashboard: hack/dashboards/nrc-slo-dashboard.json (login admin/admin from hack/dev-setup monitoring manifest)"
