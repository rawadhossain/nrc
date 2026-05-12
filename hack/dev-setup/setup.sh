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

# Phase 0 dev setup. Order (strict):
#   CRDs -> controller -> KWOK -> monitoring (Prometheus + Grafana) -> rules -> nodes -> patch-conditions.sh
#
# Prerequisites: docker OR podman, kind, kubectl, make (repo Makefile uses local tool binaries).
# Network: required to pull KWOK release manifests and Prometheus image on first run.
#
# Usage:
#   ./hack/dev-setup/setup.sh
#   KIND_CLUSTER=nrr-poc ./hack/dev-setup/setup.sh
#   SKIP_CREATE_CLUSTER=1 ./hack/dev-setup/setup.sh   # reuse existing kind cluster

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV_SETUP="${ROOT}/hack/dev-setup"
export KIND_CLUSTER="${KIND_CLUSTER:-nrr-poc}"
KWOK_VERSION="${KWOK_VERSION:-v0.6.1}"

cd "${ROOT}"

have_cluster() {
  kind get clusters 2>/dev/null | grep -qx "${KIND_CLUSTER}"
}

if [[ "${SKIP_CREATE_CLUSTER:-}" != "1" ]]; then
  if have_cluster; then
    echo "Kind cluster '${KIND_CLUSTER}' already exists; set SKIP_CREATE_CLUSTER=1 to skip this check intentionally."
  else
    echo "Creating kind cluster '${KIND_CLUSTER}'..."
    kind create cluster --name "${KIND_CLUSTER}" --config "${DEV_SETUP}/kind-cluster.yaml"
  fi
else
  echo "SKIP_CREATE_CLUSTER=1: not creating kind cluster (ensure context points at ${KIND_CLUSTER})."
fi

echo "==> Step 1/7: CRDs (make install)"
make install

echo "==> Step 2/7: Controller image + load + deploy (metrics enabled)"
if command -v docker >/dev/null 2>&1; then
  make docker-build
  make kind-load KIND_CLUSTER="${KIND_CLUSTER}"
  make deploy-with-metrics
elif command -v podman >/dev/null 2>&1; then
  make podman-build
  make kind-load KIND_CLUSTER="${KIND_CLUSTER}" CONTAINER_TOOL=podman
  make deploy IMG_PREFIX=localhost/controller IMG_TAG=latest ENABLE_METRICS=true
else
  echo "ERROR: need docker or podman to build/load the controller image." >&2
  exit 1
fi

echo "Waiting for controller rollout..."
kubectl rollout status deployment/nrr-controller-manager -n nrr-system --timeout=180s

echo "==> Step 3/7: KWOK (${KWOK_VERSION})"
kubectl apply -f "https://github.com/kubernetes-sigs/kwok/releases/download/${KWOK_VERSION}/kwok.yaml"
kubectl wait --for=condition=Established crd/stages.kwok.x-k8s.io --timeout=120s
kubectl apply -f "${ROOT}/hack/test-workloads/stage-fast.yaml"

echo "==> Step 4/7: Monitoring (Prometheus + Grafana -> nrr-metrics-service)"
kubectl apply -f "${DEV_SETUP}/monitoring/prometheus.yaml"
kubectl rollout status deployment/prometheus -n monitoring --timeout=180s
kubectl apply -f "${DEV_SETUP}/monitoring/grafana.yaml"
kubectl rollout status deployment/grafana -n monitoring --timeout=180s

echo "==> Step 5/7: NodeReadinessRules"
kubectl apply -f "${DEV_SETUP}/fake-rules.yaml"

echo "==> Step 6/7: KWOK Node objects"
kubectl apply -f "${DEV_SETUP}/kwok-nodes.yaml"

echo "==> Step 7/7: patch-conditions.sh"
bash "${DEV_SETUP}/patch-conditions.sh"

echo ""
echo "Setup complete."
echo "Verify:"
echo "  kubectl get nrr"
echo "  kubectl get nodereadinessrules -o wide"
echo "  kubectl get nodes -l kwok.x-k8s.io/node=fake"
echo "  kubectl -n nrr-system port-forward svc/nrr-metrics-service 8080:8080  # then curl localhost:8080/metrics"
echo "  kubectl -n monitoring port-forward svc/prometheus 9090:9090            # Prometheus UI"
echo "  kubectl -n monitoring port-forward svc/grafana 3000:3000                 # Grafana UI (admin/admin); import hack/dashboards/nrc-slo-dashboard.json"
echo "Demo (Phase 8): ./hack/dev-setup/demo-data.sh   # mixed KWOK/Headlamp/Grafana visuals"
echo "Cleanup demo rules: kubectl delete nodereadinessrules -l nrr-poc-demo=true"
echo "Cleanup cluster:    kind delete cluster --name ${KIND_CLUSTER}"
