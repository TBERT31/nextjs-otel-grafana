CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add some initial data
INSERT INTO todos (title, completed) VALUES
    ('Learn OpenTelemetry', true),
    ('Set up Grafana Tempo', true),
    ('Connect PostgreSQL with Go', false),
    ('Implement distributed tracing', false);