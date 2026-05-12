# NRC SLO Grafana dashboard

JSON dashboard for **Node Readiness Controller** Phase 7 observability PoC.

## File

- [`nrc-slo-dashboard.json`](./nrc-slo-dashboard.json) — UID `nrc-slo-dashboard`, tags `nrc`, `kubernetes`, `slo`, `node-readiness`

## Prerequisites

- Prometheus scraping the controller `/metrics` (`node_readiness_*` series).
- Optional: Grafana from [`../dev-setup/monitoring/grafana.yaml`](../dev-setup/monitoring/grafana.yaml) with datasource `http://prometheus.monitoring.svc.cluster.local:9090`.

## Import

1. Grafana → **Dashboards** → **New** → **Import**.
2. Upload `nrc-slo-dashboard.json` (or paste JSON).
3. Select your **Prometheus** data source for the `$datasource` variable.
4. Use the **Rule** variable to filter panels (or “All”).

## Port-forward (local dev)

```bash
kubectl -n monitoring port-forward svc/grafana 3000:3000
```

Default login from dev manifest: **admin** / **admin**.

## Notes

- Some panels depend on counters or histograms that appear only after the controller performs matching work (for example `node_readiness_taint_operations_total` after real taint add/remove paths). Sparse or empty panels in a quiet cluster are expected.
- The **Bottleneck heatmap** requires `node_readiness_condition_evaluation_total` with `mode="live"` (Phase 1 metrics).
- At the bottom of the dashboard, **“SLO-oriented quick targets (PoC)”** adds two small **stat** panels (bootstrap ≤5m share, per-node evaluation ≤50ms share) for proposal-aligned summaries; they use existing histogram series and do not replace the detailed timeseries above.
