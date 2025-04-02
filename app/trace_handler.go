package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"go.opentelemetry.io/otel/attribute"
)

// TraceAPI provides access to trace data
type TraceAPI struct {
	tempoBaseURL string
}

// NewTraceAPI creates a new trace API client
func NewTraceAPI(tempoURL string) *TraceAPI {
	return &TraceAPI{
		tempoBaseURL: tempoURL,
	}
}

// Span represents a span in a trace
type Span struct {
	TraceID           string                 `json:"traceID"`
	SpanID            string                 `json:"spanID"`
	ParentSpanID      string                 `json:"parentSpanID,omitempty"`
	Name              string                 `json:"name"`
	StartTimeUnixNano int64                  `json:"startTimeUnixNano"`
	EndTimeUnixNano   int64                  `json:"endTimeUnixNano"`
	DurationNanos     int64                  `json:"durationNanos"`
	ServiceName       string                 `json:"serviceName"`
	Attributes        map[string]interface{} `json:"attributes,omitempty"`
}

// TraceInfo represents summary information about a trace
type TraceInfo struct {
	TraceID           string `json:"traceID"`
	Name              string `json:"name"`
	ServiceName       string `json:"serviceName"`
	StartTimeUnixNano int64  `json:"startTimeUnixNano"`
	EndTimeUnixNano   int64  `json:"endTimeUnixNano"`
	DurationNanos     int64  `json:"durationNanos"`
	SpanCount         int    `json:"spanCount"`
}

// TraceDetails contains all spans for a trace
type TraceDetails struct {
	TraceID string `json:"traceID"`
	Spans   []Span `json:"spans"`
}

// getRecentTraces returns a list of recent traces
func (api *TraceAPI) getRecentTraces(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "getRecentTraces")
	defer span.End()

	// In a real app, we would query Tempo for recent traces
	// For demo purposes, we'll use simulated traces
	traces := api.generateSampleTraces()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(traces)
}

// searchTraces searches for traces based on criteria
func (api *TraceAPI) searchTraces(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "searchTraces")
	defer span.End()

	// Get search parameters
	searchType := r.URL.Query().Get("type")
	query := r.URL.Query().Get("query")

	span.SetAttributes(
		attribute.String("search.type", searchType),
		attribute.String("search.query", query),
	)

	// In a real app, we would query Tempo based on the search criteria
	// For demo purposes, we'll filter the sample traces
	traces := api.generateSampleTraces()
	var filteredTraces []TraceInfo

	// Simple filtering based on search criteria
	for _, trace := range traces {
		switch searchType {
		case "trace":
			if strings.Contains(trace.TraceID, query) {
				filteredTraces = append(filteredTraces, trace)
			}
		case "service":
			if strings.Contains(strings.ToLower(trace.ServiceName), strings.ToLower(query)) {
				filteredTraces = append(filteredTraces, trace)
			}
		case "operation":
			if strings.Contains(strings.ToLower(trace.Name), strings.ToLower(query)) {
				filteredTraces = append(filteredTraces, trace)
			}
		default:
			filteredTraces = append(filteredTraces, trace)
		}
	}

	span.SetAttributes(attribute.Int("search.results.count", len(filteredTraces)))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(filteredTraces)
}

// getTraceDetails gets detailed information about a specific trace
func (api *TraceAPI) getTraceDetails(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "getTraceDetails")
	defer span.End()

	// Get trace ID from the URL path
	traceID := strings.TrimPrefix(r.URL.Path, "/api/traces/")
	span.SetAttributes(attribute.String("trace.id", traceID))

	// In a real app, we would query Tempo for the specific trace
	// For demo purposes, we'll generate a sample trace
	trace := api.generateSampleTraceDetails(traceID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trace)
}

// serveTracesHTML serves the traces.html file
func (api *TraceAPI) serveTracesHTML(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "traces.html")
}

// Helper method to generate sample traces for demo purposes
func (api *TraceAPI) generateSampleTraces() []TraceInfo {
	// Generate a mix of todo app and database traces
	todoOperation := []string{"getAllTodos", "createTodo", "updateTodo", "deleteTodo"}
	dbOperation := []string{"queryTodos.database", "createTodo.database", "updateTodo.database", "deleteTodo.database"}

	var traces []TraceInfo
	now := time.Now().UnixNano()

	// Generate 10 sample traces
	for i := 0; i < 10; i++ {
		var operationName string
		var serviceName string

		if i%2 == 0 {
			operationName = todoOperation[i%len(todoOperation)]
			serviceName = "go-app"
		} else {
			operationName = dbOperation[i%len(dbOperation)]
			serviceName = "postgres"
		}

		// Random duration between 10ms and 500ms
		duration := (10 + int64(i*50)) * 1000000
		startTime := now - int64(i*1000000000)

		traces = append(traces, TraceInfo{
			TraceID:           fmt.Sprintf("trace-%d", i),
			Name:              operationName,
			ServiceName:       serviceName,
			StartTimeUnixNano: startTime,
			EndTimeUnixNano:   startTime + duration,
			DurationNanos:     duration,
			SpanCount:         2 + i%3,
		})
	}

	return traces
}

// Helper method to generate a sample trace with spans for demo purposes
func (api *TraceAPI) generateSampleTraceDetails(traceID string) TraceDetails {
	var spans []Span
	now := time.Now().UnixNano()

	// Root span (API handler)
	rootSpan := Span{
		TraceID:           traceID,
		SpanID:            fmt.Sprintf("%s-span-0", traceID),
		Name:              "getAllTodos",
		StartTimeUnixNano: now,
		EndTimeUnixNano:   now + 200000000,
		DurationNanos:     200000000,
		ServiceName:       "go-app",
		Attributes: map[string]interface{}{
			"http.method":      "GET",
			"http.status_code": 200,
			"http.url":         "/api/todos",
		},
	}
	spans = append(spans, rootSpan)

	// Database span (child of root)
	dbSpan := Span{
		TraceID:           traceID,
		SpanID:            fmt.Sprintf("%s-span-1", traceID),
		ParentSpanID:      rootSpan.SpanID,
		Name:              "queryTodos.database",
		StartTimeUnixNano: now + 50000000,
		EndTimeUnixNano:   now + 180000000,
		DurationNanos:     130000000,
		ServiceName:       "go-app",
		Attributes: map[string]interface{}{
			"db.system":       "postgresql",
			"db.statement":    "SELECT id, title, completed, created_at FROM todos ORDER BY id",
			"todos.count":     4,
		},
	}
	spans = append(spans, dbSpan)

	// SQL prepare span (child of db)
	sqlPrepareSpan := Span{
		TraceID:           traceID,
		SpanID:            fmt.Sprintf("%s-span-2", traceID),
		ParentSpanID:      dbSpan.SpanID,
		Name:              "db.prepare",
		StartTimeUnixNano: now + 60000000,
		EndTimeUnixNano:   now + 80000000,
		DurationNanos:     20000000,
		ServiceName:       "go-app",
		Attributes: map[string]interface{}{
			"db.system": "postgresql",
		},
	}
	spans = append(spans, sqlPrepareSpan)

	// SQL execute span (child of db)
	sqlExecuteSpan := Span{
		TraceID:           traceID,
		SpanID:            fmt.Sprintf("%s-span-3", traceID),
		ParentSpanID:      dbSpan.SpanID,
		Name:              "db.execute",
		StartTimeUnixNano: now + 90000000,
		EndTimeUnixNano:   now + 170000000,
		DurationNanos:     80000000,
		ServiceName:       "go-app",
		Attributes: map[string]interface{}{
			"db.system": "postgresql",
			"db.rows":   4,
		},
	}
	spans = append(spans, sqlExecuteSpan)

	return TraceDetails{
		TraceID: traceID,
		Spans:   spans,
	}
}