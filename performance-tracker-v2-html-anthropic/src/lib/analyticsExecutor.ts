import { PlannerJSON } from './analyticsSchema';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const parseLocalDate = (dateStr: string | number | Date) => {
  if (!dateStr) return new Date(NaN);
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).split('T')[0].split(' ')[0];
  return new Date(`${str}T00:00:00`);
};

export function executePlan(plan: PlannerJSON, data: any[], availableKeys: string[]) {
  // 1. Filter Data
  let filtered = [...data];
  
  // Date filtering
  let startDate: Date | null = null;
  let endDate: Date | null = new Date();

  const dateField = availableKeys.find(k => /data|date|time|created/i.test(k));

  if (dateField && data.length > 0) {
    const dates = data.map(d => parseLocalDate(d[dateField])).filter(d => !isNaN(d.getTime()));
    if (dates.length > 0) {
      endDate = new Date(Math.max(...dates.map(d => d.getTime())));
      endDate.setHours(23, 59, 59, 999);
    }
  }
  
  if (plan.timeRange.mode === 'last_7') { startDate = subDays(endDate, 7); startDate.setHours(0, 0, 0, 0); }
  else if (plan.timeRange.mode === 'last_15') { startDate = subDays(endDate, 15); startDate.setHours(0, 0, 0, 0); }
  else if (plan.timeRange.mode === 'last_30') { startDate = subDays(endDate, 30); startDate.setHours(0, 0, 0, 0); }
  else if (plan.timeRange.mode === 'this_month') { startDate = startOfMonth(endDate); startDate.setHours(0, 0, 0, 0); }
  else if (plan.timeRange.mode === 'last_month') {
    startDate = startOfMonth(subMonths(endDate, 1));
    startDate.setHours(0, 0, 0, 0);
    endDate = endOfMonth(subMonths(endDate, 1));
    endDate.setHours(23, 59, 59, 999);
  }
  else if (plan.timeRange.mode === 'custom' && plan.timeRange.start && plan.timeRange.end) {
    startDate = new Date(`${plan.timeRange.start}T00:00:00`);
    endDate = new Date(`${plan.timeRange.end}T23:59:59`);
  }

  if (dateField && startDate && endDate) {
    filtered = filtered.filter(d => {
      const dDate = parseLocalDate(d[dateField]);
      return dDate >= startDate! && dDate <= endDate!;
    });
  }

  // Dimension filters
  if (plan.filters) {
    Object.entries(plan.filters).forEach(([key, value]) => {
      const actualKey = availableKeys.find(k => k.toLowerCase() === key.toLowerCase());
      if (actualKey) {
        filtered = filtered.filter(d => {
          const dataVal = String(d[actualKey]).toLowerCase();
          if (Array.isArray(value)) {
            return value.some(v => {
              const filterVal = String(v).toLowerCase();
              return dataVal === filterVal || dataVal.includes(filterVal) || filterVal.includes(dataVal);
            });
          }
          const filterVal = String(value).toLowerCase();
          return dataVal === filterVal || dataVal.includes(filterVal) || filterVal.includes(dataVal);
        });
      }
    });
  }

  // 2. Group & Aggregate
  const grouped: Record<string, any> = {};
  
  filtered.forEach(d => {
    let groupKey = 'Total';
    
    if (plan.dimensions && plan.dimensions.length > 0) {
      const dimVals = plan.dimensions.map(dim => {
        const actualKey = availableKeys.find(k => k.toLowerCase() === dim.toLowerCase());
        return actualKey ? String(d[actualKey] || 'N/A') : 'N/A';
      });
      groupKey = dimVals.join(' | ');
    }
    
    if (plan.granularity !== 'none' && dateField) {
      const dDate = parseLocalDate(d[dateField]);
      let dateKey = format(dDate, 'yyyy-MM-dd');
      if (plan.granularity === 'month') dateKey = format(dDate, 'yyyy-MM');
      groupKey = groupKey === 'Total' ? dateKey : `${dateKey} | ${groupKey}`;
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = { _group: groupKey };
      plan.metrics.forEach(m => {
        if (!['cpmql', 'cac', 'cpsal', 'conv_mql_mat', 'conv_mql_ticket', 'conv_ticket_mat'].includes(m.toLowerCase())) {
          grouped[groupKey][m] = 0;
        }
      });
      // Always track base metrics for derived calculations
      grouped[groupKey]._inv = 0;
      grouped[groupKey]._mql = 0;
      grouped[groupKey]._sal = 0;
      grouped[groupKey]._mat = 0;
    }

    const invField = availableKeys.find(k => k.toLowerCase() === 'investimento') || availableKeys.find(k => /investimento|cost|custo|valor/i.test(k));
    const mqlField = availableKeys.find(k => k.toLowerCase() === 'mql') || availableKeys.find(k => /mqls|mql|leads/i.test(k));
    const ticketField = availableKeys.find(k => k.toLowerCase() === 'tickets') || availableKeys.find(k => /tickets|ticket/i.test(k));
    const matField = availableKeys.find(k => k.toLowerCase() === 'matriculas') || availableKeys.find(k => /matriculas|matricula|inscritos/i.test(k));

    if (invField) grouped[groupKey]._inv += Number(d[invField]) || 0;
    if (mqlField) grouped[groupKey]._mql += Number(d[mqlField]) || 0;
    if (ticketField) grouped[groupKey]._sal += Number(d[ticketField]) || 0;
    if (matField) grouped[groupKey]._mat += Number(d[matField]) || 0;

    plan.metrics.forEach(m => {
      const actualKey = availableKeys.find(k => k.toLowerCase() === m.toLowerCase());
      if (actualKey && !['cpmql', 'cac', 'cpsal', 'conv_mql_mat', 'conv_mql_ticket', 'conv_ticket_mat'].includes(m.toLowerCase())) {
        grouped[groupKey][m] += Number(d[actualKey]) || 0;
      }
    });
  });

  // 3. Calculate Derived Metrics
  const results = Object.values(grouped).map(g => {
    const inv = g._inv;
    const mql = g._mql;
    const sal = g._sal;
    const mat = g._mat;

    if (plan.metrics.includes('cpmql')) g.cpmql = mql > 0 ? inv / mql : 0;
    if (plan.metrics.includes('cac')) g.cac = mat > 0 ? inv / mat : 0;
    if (plan.metrics.includes('cpsal')) g.cpsal = sal > 0 ? inv / sal : 0;
    if (plan.metrics.includes('conv_mql_mat')) g.conv_mql_mat = mql > 0 ? (mat / mql) * 100 : 0;
    if (plan.metrics.includes('conv_mql_ticket')) g.conv_mql_ticket = mql > 0 ? (sal / mql) * 100 : 0;
    if (plan.metrics.includes('conv_ticket_mat')) g.conv_ticket_mat = sal > 0 ? (mat / sal) * 100 : 0;

    delete g._inv;
    delete g._mql;
    delete g._sal;
    delete g._mat;

    return g;
  });

  // Sort and limit
  const allResults = [...results];
  if (plan.analysisType === 'ranking' && plan.metrics.length > 0) {
    const sortMetric = plan.metrics[0];
    allResults.sort((a, b) => (Number(b[sortMetric]) || 0) - (Number(a[sortMetric]) || 0));
  }

  let finalResults = allResults;
  if (plan.limit && finalResults.length > plan.limit) {
    finalResults = finalResults.slice(0, plan.limit);
  }

  // 4. Calculate Metadata
  let minDate = null;
  let maxDate = null;
  if (dateField && filtered.length > 0) {
    const dates = filtered.map(d => parseLocalDate(d[dateField])).filter(d => !isNaN(d.getTime()));
    if (dates.length > 0) {
      minDate = format(new Date(Math.min(...dates.map(d => d.getTime()))), 'yyyy-MM-dd');
      maxDate = format(new Date(Math.max(...dates.map(d => d.getTime()))), 'yyyy-MM-dd');
    }
  }

  return {
    metadata: {
      total_linhas_filtradas: filtered.length,
      data_minima: minDate,
      data_maxima: maxDate
    },
    results: finalResults,
    allResults
  };
}
