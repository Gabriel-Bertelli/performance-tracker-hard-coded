export interface TimeRange {
  mode: 'all' | 'custom' | 'last_7' | 'last_15' | 'last_30' | 'this_month' | 'last_month' | 'this_year';
  start?: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
}

export interface Comparison {
  type: 'none' | 'previous_period' | 'year_over_year';
}

export interface PlannerJSON {
  intent: string;
  analysisType: 'summary' | 'trend' | 'ranking' | 'comparison' | 'metadata';
  metrics: string[];
  dimensions: string[];
  filters: Record<string, string | string[]>;
  timeRange: TimeRange;
  granularity: 'day' | 'week' | 'month' | 'none';
  comparison: Comparison;
  limit?: number;
  warnings?: string[];
}
