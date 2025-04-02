FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY *.go *.html ./

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /go-app

# Final stage
FROM alpine:3.18

WORKDIR /

# Copy the binary from builder
COPY --from=builder /go-app /go-app

# Copy the HTML files
COPY --from=builder /app/index.html /index.html
COPY --from=builder /app/traces.html /traces.html

# Run the application
CMD ["/go-app"]