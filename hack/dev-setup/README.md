# hack/dev-setup — (PoC local environment)

This directory implements **Phase 0** of the NRC observability PoC plan and the Phase 8 demo automation.

## Architecture and demo (what you are running)

| Layer | Role |
| ----- | ---- |
| **Kind + KWOK** | Real apiserver; ~20 fake nodes with patched `status.conditions`. |
| **NRC controller** | Evaluates `NodeReadinessRule` objects, manages taints, exposes `node_readiness_*` metrics. |
| **Prometheus + Grafana** | Optional in-cluster scrape + dashboard import (`hack/dashboards/nrc-slo-dashboard.json`). |
| **Headlamp plugin** | `plugins/node-readiness-controller`: Overview, Rules, Rule detail, Active blockers (links to Kubernetes Node UI). |

**Typical flow:** `setup.sh` provisions the stack → import the Grafana dashboard (if using Grafana) → install/copy the Headlamp plugin per `plugins/node-readiness-controller/INSTALL.md` → run **`demo-data.sh`** (or **`demo.sh`**) for a mixed, visually rich state → use **`demo-data.sh --reset`** to return KWOK nodes to “all passing” and clear synthetic `failedNodes`, then re-run **`demo-data.sh`** without args to re-apply the demo.

### Screenshots (placeholders)

_Add cluster UI screenshots here after a demo run, for example: Headlamp sidebar **Node readiness** → Overview; Active blockers with node links; Rule detail with dry-run / errors; Grafana NRC SLO dashboard overview._

## Strict setup order

1. **CRDs** — `make install` from repo root
2. **Controller** — build image, `kind load`, `make deploy-with-metrics`
3. **KWOK** — in-cluster KWOK + `hack/test-workloads/stage-fast.yaml`
4. **Monitoring** — minimal Prometheus in `monitoring/` scraping `nrr-metrics-service.nrr-system:8080`
5. **Rules** — `fake-rules.yaml`
6. **Nodes** — `kwok-nodes.yaml` (20 fake nodes)
7. `**patch-conditions.sh`** — mixed `status.conditions` for demo

## One-shot setup

From the **repository root**:

```bash
chmod +x hack/dev-setup/setup.sh hack/dev-setup/patch-conditions.sh
./hack/dev-setup/setup.sh
```

Defaults:

- Kind cluster name: `**nrr-poc**` (see `kind-cluster.yaml`)
- Override: `KIND_CLUSTER=my-cluster ./hack/dev-setup/setup.sh`
- Reuse existing cluster: `SKIP_CREATE_CLUSTER=1 ./hack/dev-setup/setup.sh` (kubeconfig must point at it)

**Podman:** the script uses `podman-build`, `CONTAINER_TOOL=podman` for `kind-load`, and `IMG_PREFIX=localhost/controller` for deploy (same pattern as `docs/TEST_README.md`).

**KWOK:** `KWOK_VERSION` defaults to `v0.6.1`; requires network to download the release YAML once.

## Files


| File                         | Purpose                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `setup.sh`                   | Orchestrates the ordered steps above                                                            |
| `kind-cluster.yaml`          | Single control-plane Kind cluster                                                               |
| `fake-rules.yaml`            | Four `NodeReadinessRule` objects (gpu, cni, storage, **dry-run** fabric)                        |
| `kwok-nodes.yaml`            | Twenty KWOK nodes (`demo-ruleset` + `kwok.x-k8s.io/node=fake` label)                            |
| `patch-conditions.sh`        | Patches node conditions (pass / fail / missing type → Unknown)                                  |
| `monitoring/prometheus.yaml` | Small Prometheus deployment + Service                                                           |
| `monitoring/grafana.yaml`    | Optional Grafana + Service; Prometheus datasource pre-provisioned                               |
| `demo-data.sh`               | Phase 8: mixed demo (conditions, stuck hint, synthetic `failedNodes`, forced taint for metrics) |
| `patch-active-blockers-screenshot-mix.sh` | Optional: patch two blocked evaluations (fresh vs ~15m `lastEvaluationTime`) for Headlamp Active blockers screenshots |
| `demo.sh`                    | Optional: `setup.sh` then `demo-data.sh`                                                        |


##  demo data

After `setup.sh` (or any cluster that already has the demo rules + KWOK nodes):

```bash
chmod +x hack/dev-setup/demo-data.sh
./hack/dev-setup/demo-data.sh
```

- Reuses `patch-conditions.sh` unless `SKIP_PATCH_CONDITIONS=1`.
- **Taint metrics:** cycles conditions on `kwok-demo-gpu-2` and `kwok-demo-cni-2` (pass → fail) so the controller performs remove + add taint (`node_readiness_taint_operations_total`).
- **Stuck (Active blockers):** Headlamp uses `nodeEvaluations[].lastEvaluationTime`, not node condition times. With `**jq`** installed, the script patches an old timestamp for `cni-rule` / `kwok-demo-cni-2`; without `jq`, that step is skipped.
- Injects a **synthetic** `status.failedNodes` row on `cni-rule` for the error panel (`DemoInjected`).
- **Reset** all demo nodes to “all conditions pass” for their ruleset and clear the synthetic `cni-rule` `status.failedNodes` inject: `./hack/dev-setup/demo-data.sh --reset`

### Headlamp Active blockers: mix Stuck vs not stuck (screenshots)

The Active blockers page marks **Stuck** when `lastEvaluationTime` is about **10+ minutes** old. To get **one fresh row and one Stuck row** for a screenshot (after `demo-data.sh` or any cluster with ≥2 blocked evaluations):

```bash
chmod +x hack/dev-setup/patch-active-blockers-screenshot-mix.sh
./hack/dev-setup/patch-active-blockers-screenshot-mix.sh
```

Then open Headlamp → **Active blockers** and refresh. The controller may overwrite `lastEvaluationTime` on reconcile—capture the screenshot soon after patching.

One-shot setup + demo:

```bash
chmod +x hack/dev-setup/demo.sh
./hack/dev-setup/demo.sh
# reuse existing Kind cluster:
# SKIP_CREATE_CLUSTER=1 ./hack/dev-setup/demo.sh
# only re-run demo steps on an already-provisioned cluster:
# SKIP_SETUP=1 ./hack/dev-setup/demo.sh
# equivalent:
# ./hack/dev-setup/demo.sh --data-only
# reset demo nodes only:
# ./hack/dev-setup/demo.sh --reset
```

## Grafana

Does not change Prometheus. Apply after `monitoring/prometheus.yaml` exists and the `prometheus` Service is up:

```bash
kubectl apply -f hack/dev-setup/monitoring/grafana.yaml
kubectl rollout status deployment/grafana -n monitoring --timeout=180s
kubectl -n monitoring port-forward svc/grafana 3000:3000
```

Open **[http://localhost:3000](http://localhost:3000)** → login **admin** / **admin** → **Connections → Data sources** should show **Prometheus** pointing at `http://prometheus.monitoring.svc.cluster.local:9090`. Import **Dashboards → New → Import** → upload `hack/dashboards/nrc-slo-dashboard.json` and choose that datasource.

```bash
kubectl get nrr
# Expect: gpu-driver-rule, cni-rule, storage-rule, network-fabric-rule-dryrun

kubectl get nodes -l kwok.x-k8s.io/node=fake
# Expect: 20 nodes

kubectl get pods -n nrr-system
kubectl get pods -n monitoring
```

Metrics:

```bash
kubectl -n nrr-system port-forward svc/nrr-metrics-service 8080:8080
curl -s localhost:8080/metrics | head
```

## Cleanup

```bash
kubectl delete nodereadinessrules -l nrr-poc-demo=true
kubectl delete nodes -l kwok.x-k8s.io/node=fake
kind delete cluster --name nrr-poc
kubectl delete namespace monitoring --ignore-not-found=true
```

