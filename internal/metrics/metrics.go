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

package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"sigs.k8s.io/controller-runtime/pkg/metrics"
)

var (
	// RulesTotal tracks the number of NodeReadinessRules .
	RulesTotal = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "node_readiness_rules_total",
			Help: "Number of NodeReadinessRules",
		},
	)

	// TaintOperations tracks the number of taint operations (add/remove).
	TaintOperations = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "node_readiness_taint_operations_total",
			Help: "Total number of taint operations performed by the controller",
		},
		[]string{"rule", "operation"},
	)

	// EvaluationDuration tracks the duration of a single rule evaluation against one node (per-node evaluate path).
	//
	// BREAKING CHANGE: This metric used to be a plain Histogram with no labels. It is now a HistogramVec labeled by rule.
	// Do not register another collector with the same metric name: Prometheus will panic on duplicate names with different label sets.
	EvaluationDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "node_readiness_evaluation_duration_seconds",
			Help:    "Duration of per-node rule evaluations (single rule, single node)",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"rule"},
	)

	// Failures tracks the number of operational failures.
	Failures = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "node_readiness_failures_total",
			Help: "Total number of operational failures",
		},
		[]string{"rule", "reason"},
	)

	// BootstrapCompleted tracks the number of nodes that have completed bootstrap.
	BootstrapCompleted = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "node_readiness_bootstrap_completed_total",
			Help: "Total number of nodes that have completed bootstrap",
		},
		[]string{"rule"},
	)

	// BootstrapDuration tracks elapsed time from the first managed taint addition until bootstrap completion (annotation).
	BootstrapDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "node_readiness_bootstrap_duration_seconds",
			Help:    "Duration from first managed taint add until bootstrap completion per rule",
			Buckets: []float64{1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600},
		},
		[]string{"rule"},
	)

	// ReconciliationLatency tracks end-to-end NodeReadinessRule reconcile duration.
	ReconciliationLatency = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "node_readiness_reconciliation_latency_seconds",
			Help:    "Duration of NodeReadinessRule reconcile invocations",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"rule", "operation"},
	)

	// NodesByState tracks aggregate counts of node evaluations by coarse readiness state per rule.
	NodesByState = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "node_readiness_nodes_by_state",
			Help: "Current number of node evaluations per rule and observed state",
		},
		[]string{"rule", "state"},
	)

	// RuleLastReconciliationTimestamp tracks the Unix time of the last completed rule reconcile (success path).
	RuleLastReconciliationTimestamp = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "node_readiness_rule_last_reconciliation_timestamp_seconds",
			Help: "Unix timestamp of the last successful NodeReadinessRule reconcile completion",
		},
		[]string{"rule"},
	)

	// ConditionEvaluationTotal counts per-condition pass/fail in live or dry-run evaluation paths.
	ConditionEvaluationTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "node_readiness_condition_evaluation_total",
			Help: "Total number of individual condition evaluations (live reconcile vs dry-run)",
		},
		[]string{"rule", "condition_type", "result", "mode"},
	)
)

func init() {
	// Register custom metrics with the global prometheus registry
	metrics.Registry.MustRegister(RulesTotal)
	metrics.Registry.MustRegister(TaintOperations)
	metrics.Registry.MustRegister(EvaluationDuration)
	metrics.Registry.MustRegister(Failures)
	metrics.Registry.MustRegister(BootstrapCompleted)
	metrics.Registry.MustRegister(BootstrapDuration)
	metrics.Registry.MustRegister(ReconciliationLatency)
	metrics.Registry.MustRegister(NodesByState)
	metrics.Registry.MustRegister(RuleLastReconciliationTimestamp)
	metrics.Registry.MustRegister(ConditionEvaluationTotal)
}
