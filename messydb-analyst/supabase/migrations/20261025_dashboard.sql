-- Create queries table
CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  result JSONB,
  status TEXT CHECK (status IN ('pending', 'success', 'error')) DEFAULT 'pending',
  execution_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_metric_name ON analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp DESC);

-- Insert sample data
INSERT INTO queries (user_id, query_text, result, status, execution_time) VALUES
  ('user_1', 'SELECT * FROM students WHERE grade > 80', '{"rows": 45, "data": []}', 'success', 120),
  ('user_1', 'SELECT COUNT(*) FROM enrollments', '{"count": 1250}', 'success', 85),
  ('user_2', 'SELECT * FROM courses WHERE active = true', '{"rows": 23, "data": []}', 'success', 95);

INSERT INTO analytics (metric_name, metric_value) VALUES
  ('total_queries', 1247),
  ('active_users', 89),
  ('avg_response_time', 102),
  ('success_rate', 94.5);
