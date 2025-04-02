package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gorilla/mux/otelmux"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	tracer trace.Tracer
	db     *sql.DB
)

// Todo represents a todo item
type Todo struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"created_at"`
}

// StructuredLogEntry represents a structured log entry with trace context
type StructuredLogEntry struct {
	Level    string    `json:"level"`
	Message  string    `json:"msg"`
	Time     time.Time `json:"time"`
	TraceID  string    `json:"trace_id,omitempty"`
	SpanID   string    `json:"span_id,omitempty"`
	Service  string    `json:"service"`
}

// Logger is a simple structured logger with trace context
type Logger struct {
	serviceName string
	logFile     *os.File
}

// NewLogger creates a new structured logger
func NewLogger(serviceName string) *Logger {
	logger := &Logger{
		serviceName: serviceName,
	}

	// Check if LOG_FILE environment variable is set
	logFilePath := os.Getenv("LOG_FILE")
	if logFilePath != "" {
		file, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			log.Printf("Failed to open log file: %v", err)
		} else {
			logger.logFile = file
		}
	}

	return logger
}

// Log emits a structured log with trace context
func (l *Logger) Log(ctx context.Context, level, message string) {
	spanCtx := trace.SpanContextFromContext(ctx)

	entry := StructuredLogEntry{
		Level:    level,
		Message:  message,
		Time:     time.Now().UTC(),
		Service:  l.serviceName,
	}

	if spanCtx.IsValid() {
		entry.TraceID = spanCtx.TraceID().String()
		entry.SpanID = spanCtx.SpanID().String()
	}

	jsonBytes, err := json.Marshal(entry)
	if err != nil {
		log.Printf("Failed to marshal log entry: %v", err)
		return
	}

	// Output to console
	fmt.Println(string(jsonBytes))

	// Also write to file if configured
	if l.logFile != nil {
		// Reopen the file each time to ensure we get a fresh file handle
		logFilePath := os.Getenv("LOG_FILE")
		if logFilePath != "" {
			// Use shell command to append to log file
			cmd := fmt.Sprintf("echo '%s' >> %s", string(jsonBytes), logFilePath)
			_, err := exec.Command("sh", "-c", cmd).Output()
			if err != nil {
				fmt.Printf("Failed to write with system command: %v\n", err)
			}
		}
	}
}

// Info logs an info message
func (l *Logger) Info(ctx context.Context, message string) {
	l.Log(ctx, "info", message)
}

// Error logs an error message
func (l *Logger) Error(ctx context.Context, message string, err error) {
	if err != nil {
		message = fmt.Sprintf("%s: %v", message, err)
	}
	l.Log(ctx, "error", message)
}

// Warn logs a warning message
func (l *Logger) Warn(ctx context.Context, message string) {
	l.Log(ctx, "warn", message)
}

// Close the logger and any open file handles
func (l *Logger) Close() {
	if l.logFile != nil {
		l.logFile.Close()
	}
}

// Global logger instance
var logger *Logger

func connectDB() (*sql.DB, error) {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "postgres")
	dbname := getEnv("DB_NAME", "tododb")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	return sql.Open("postgres", connStr)
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func initTracer() func(context.Context) error {
	ctx := context.Background()

	otlpEndpoint := getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")
	serviceName := getEnv("OTEL_SERVICE_NAME", "go-app")

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
		),
	)
	if err != nil {
		log.Fatalf("Failed to create resource: %v", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	conn, err := grpc.DialContext(ctx, otlpEndpoint,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		log.Fatalf("Failed to connect to OTLP endpoint: %v", err)
	}

	client := otlptracegrpc.NewClient(otlptracegrpc.WithGRPCConn(conn))
	exporter, err := otlptrace.New(ctx, client)
	if err != nil {
		log.Fatalf("Failed to create OTLP trace exporter: %v", err)
	}

	bsp := sdktrace.NewBatchSpanProcessor(exporter)
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithResource(res),
		sdktrace.WithSpanProcessor(bsp),
	)
	otel.SetTracerProvider(tracerProvider)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	tracer = otel.Tracer("go-app")

	return func(ctx context.Context) error {
		return tracerProvider.Shutdown(ctx)
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "indexHandler")
	defer span.End()

	content, err := ioutil.ReadFile("index.html")
	if err != nil {
		handleError(w, "Failed to read index.html", err, http.StatusInternalServerError, span)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.Write(content)
}

func getAllTodos(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "getAllTodos")
	defer span.End()

	todos, err := queryTodos(ctx)
	if err != nil {
		handleError(w, "Failed to get todos", err, http.StatusInternalServerError, span)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(todos)
}

func queryTodos(ctx context.Context) ([]Todo, error) {
	ctx, span := tracer.Start(ctx, "queryTodos.database")
	defer span.End()

	query := "SELECT id, title, completed, created_at FROM todos ORDER BY id"
	span.SetAttributes(attribute.String("db.statement", query))

	logger.Info(ctx, fmt.Sprintf("Executing SQL query: %s", query))

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		logger.Error(ctx, "Failed to query todos", err)
		span.RecordError(err)
		return nil, err
	}
	defer rows.Close()

	var todos []Todo
	for rows.Next() {
		var todo Todo
		if err := rows.Scan(&todo.ID, &todo.Title, &todo.Completed, &todo.CreatedAt); err != nil {
			span.RecordError(err)
			return nil, err
		}
		todos = append(todos, todo)
	}

	if err := rows.Err(); err != nil {
		span.RecordError(err)
		return nil, err
	}

	span.SetAttributes(attribute.Int("todos.count", len(todos)))
	return todos, nil
}

func createTodo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "createTodo")
	defer span.End()

	var todo Todo
	if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
		handleError(w, "Invalid request payload", err, http.StatusBadRequest, span)
		return
	}

	logger.Info(ctx, fmt.Sprintf("Creating new todo: %s", todo.Title))

	ctx, dbSpan := tracer.Start(ctx, "createTodo.database")
	defer dbSpan.End()

	query := "INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING id, created_at"
	dbSpan.SetAttributes(attribute.String("db.statement", query))
	logger.Info(ctx, fmt.Sprintf("Executing SQL query: %s", query))

	err := db.QueryRowContext(ctx, query, todo.Title, todo.Completed).Scan(&todo.ID, &todo.CreatedAt)

	if err != nil {
		handleError(w, "Failed to create todo", err, http.StatusInternalServerError, dbSpan)
		return
	}

	dbSpan.SetAttributes(attribute.Int("todo.id", todo.ID))
	logger.Info(ctx, fmt.Sprintf("Created todo with ID: %d", todo.ID))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(todo)
}

func updateTodo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "updateTodo")
	defer span.End()

	params := mux.Vars(r)
	id, err := strconv.Atoi(params["id"])
	if err != nil {
		handleError(w, "Invalid todo ID", err, http.StatusBadRequest, span)
		return
	}

	var todo Todo
	if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
		handleError(w, "Invalid request payload", err, http.StatusBadRequest, span)
		return
	}

	logger.Info(ctx, fmt.Sprintf("Updating todo ID: %d", id))

	ctx, dbSpan := tracer.Start(ctx, "updateTodo.database")
	defer dbSpan.End()
	dbSpan.SetAttributes(attribute.Int("todo.id", id))

	query := fmt.Sprintf("UPDATE todos SET completed = %t WHERE id = %d", todo.Completed, id)
	dbSpan.SetAttributes(attribute.String("db.statement", query))
	logger.Info(ctx, fmt.Sprintf("Executing SQL query: %s", query))

	result, err := db.ExecContext(ctx, "UPDATE todos SET completed = $1 WHERE id = $2", todo.Completed, id)

	if err != nil {
		handleError(w, "Failed to update todo", err, http.StatusInternalServerError, dbSpan)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		handleError(w, "Failed to get rows affected", err, http.StatusInternalServerError, dbSpan)
		return
	}

	if rowsAffected == 0 {
		handleError(w, "Todo not found", fmt.Errorf("todo with id %d not found", id), http.StatusNotFound, dbSpan)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func deleteTodo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	_, span := tracer.Start(ctx, "deleteTodo")
	defer span.End()

	params := mux.Vars(r)
	id, err := strconv.Atoi(params["id"])
	if err != nil {
		handleError(w, "Invalid todo ID", err, http.StatusBadRequest, span)
		return
	}

	logger.Info(ctx, fmt.Sprintf("Deleting todo ID: %d", id))

	ctx, dbSpan := tracer.Start(ctx, "deleteTodo.database")
	defer dbSpan.End()
	dbSpan.SetAttributes(attribute.Int("todo.id", id))

	query := fmt.Sprintf("DELETE FROM todos WHERE id = %d", id)
	dbSpan.SetAttributes(attribute.String("db.statement", query))
	logger.Info(ctx, fmt.Sprintf("Executing SQL query: %s", query))

	result, err := db.ExecContext(ctx, "DELETE FROM todos WHERE id = $1", id)
	if err != nil {
		handleError(w, "Failed to delete todo", err, http.StatusInternalServerError, dbSpan)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		handleError(w, "Failed to get rows affected", err, http.StatusInternalServerError, dbSpan)
		return
	}

	if rowsAffected == 0 {
		handleError(w, "Todo not found", fmt.Errorf("todo with id %d not found", id), http.StatusNotFound, dbSpan)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func handleError(w http.ResponseWriter, message string, err error, statusCode int, span trace.Span) {
	logger.Error(trace.ContextWithSpan(context.Background(), span), message, err)

	span.RecordError(err)
	span.SetAttributes(attribute.String("error.message", message))
	span.SetAttributes(attribute.Int("error.http.status_code", statusCode))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func healthcheck(w http.ResponseWriter, r *http.Request) {
	// Simple healthcheck endpoint for container orchestration
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "timestamp": time.Now().String()})
}

func main() {
	// Initialize logger
	logger = NewLogger("go-app")
	defer logger.Close()

	logger.Info(context.Background(), "Starting OpenTelemetry Go Todo application...")

	// Initialize OpenTelemetry
	shutdown := initTracer()
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			logger.Error(context.Background(), "Failed to shutdown tracer", err)
		}
	}()

	// Connect to database
	var err error
	db, err = connectDB()
	if err != nil {
		logger.Error(context.Background(), "Failed to connect to database", err)
		os.Exit(1)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		logger.Error(context.Background(), "Failed to ping database", err)
		os.Exit(1)
	}
	logger.Info(context.Background(), "Successfully connected to PostgreSQL")

	// Create a new router with OpenTelemetry instrumentation
	r := mux.NewRouter()
	r.Use(otelmux.Middleware("go-app-server"))

	// Create trace API
	tempoURL := getEnv("TEMPO_URL", "http://tempo:3200")
	traceAPI := NewTraceAPI(tempoURL)

	// Define routes
	r.HandleFunc("/", indexHandler).Methods("GET")
	r.HandleFunc("/traces", traceAPI.serveTracesHTML).Methods("GET")
	r.HandleFunc("/health", healthcheck).Methods("GET")

	// API endpoints
	api := r.PathPrefix("/api").Subrouter()

	// Todo API
	api.HandleFunc("/todos", getAllTodos).Methods("GET")
	api.HandleFunc("/todos", createTodo).Methods("POST")
	api.HandleFunc("/todos/{id:[0-9]+}", updateTodo).Methods("PUT")
	api.HandleFunc("/todos/{id:[0-9]+}", deleteTodo).Methods("DELETE")

	// Trace API
	api.HandleFunc("/traces", traceAPI.getRecentTraces).Methods("GET")
	api.HandleFunc("/traces/search", traceAPI.searchTraces).Methods("GET")
	api.HandleFunc("/traces/{traceID}", traceAPI.getTraceDetails).Methods("GET")

	// Start server
	port := "8080"
	logger.Info(context.Background(), fmt.Sprintf("Server listening on port %s", port))
	if err := http.ListenAndServe(":"+port, r); err != nil {
		logger.Error(context.Background(), "Server failed", err)
		os.Exit(1)
	}
}