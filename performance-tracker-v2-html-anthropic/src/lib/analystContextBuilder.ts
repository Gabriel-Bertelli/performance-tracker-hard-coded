interface ExecutionResult {
  metadata: Record<string, any>;
  results: any[];
  allResults?: any[];
}

function roundValue(value: any) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  if (Math.abs(value) >= 1000) return Math.round(value * 100) / 100;
  return Math.round(value * 10000) / 10000;
}

function normalizeRow(row: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, roundValue(value)])
  );
}

function summarizeMetric(results: any[], metric: string) {
  const values = results
    .map(r => Number(r[metric]))
    .filter(v => Number.isFinite(v));

  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  return {
    metric,
    count: values.length,
    min: roundValue(sorted[0]),
    p50: roundValue(median),
    avg: roundValue(avg),
    max: roundValue(sorted[sorted.length - 1]),
    total: roundValue(sum)
  };
}

export function buildAnalystContext(params: {
  userMessage: string;
  plan: Record<string, any>;
  executionResult: ExecutionResult;
}) {
  const { userMessage, plan, executionResult } = params;
  const allResults = executionResult.allResults || executionResult.results || [];
  const metrics: string[] = Array.isArray(plan.metrics) ? plan.metrics : [];
  const primaryMetric = metrics[0];
  const hasTemporalGrouping = allResults.some(r => String(r._group || '').match(/^\d{4}-\d{2}(-\d{2})?/));

  const metricSummaries = metrics
    .map(metric => summarizeMetric(allResults, metric))
    .filter(Boolean);

  const topRows = primaryMetric
    ? [...allResults]
        .sort((a, b) => (Number(b[primaryMetric]) || 0) - (Number(a[primaryMetric]) || 0))
        .slice(0, 50)
        .map(normalizeRow)
    : allResults.slice(0, 50).map(normalizeRow);

  const bottomRows = primaryMetric
    ? [...allResults]
        .sort((a, b) => (Number(a[primaryMetric]) || 0) - (Number(b[primaryMetric]) || 0))
        .slice(0, 30)
        .map(normalizeRow)
    : [];

  const temporalRows = hasTemporalGrouping
    ? allResults.slice(0, 120).map(normalizeRow)
    : [];

  const compactAllRows = allResults.length <= 200
    ? allResults.map(normalizeRow)
    : undefined;

  const payload = {
    pergunta: userMessage,
    plano: plan,
    contexto: {
      estrategia: compactAllRows ? 'full_results' : 'summarized_results',
      quantidade_grupos_resultantes: allResults.length,
      metrica_principal: primaryMetric || null,
      metricas_resumo: metricSummaries,
      metadata: executionResult.metadata,
    },
    resultados_completos: compactAllRows,
    recortes: compactAllRows ? undefined : {
      top_grupos: topRows,
      bottom_grupos: bottomRows,
      serie_ou_amostra: temporalRows,
    }
  };

  return JSON.stringify(payload, null, 2);
}
