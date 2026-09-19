export default function Analytics({ data }) {
  if (!data) return <p className="hint">Loading analytics…</p>;

  const maxCategory = Math.max(1, ...data.by_category.map((c) => c.count));
  const maxTrend = Math.max(1, ...data.trend.map((d) => Math.max(d.reported, d.resolved)));

  return (
    <div className="analytics">
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="label">Total reports</span>
          <p className="kpi-number">{data.total}</p>
        </div>
        <div className="kpi-card">
          <span className="label">Resolved</span>
          <p className="kpi-number">{data.resolution_rate}%</p>
          <span className="hint">{data.resolved} closed</span>
        </div>
        <div className="kpi-card">
          <span className="label">Avg. resolution time</span>
          <p className="kpi-number">
            {data.avg_resolution_hours != null ? `${data.avg_resolution_hours}h` : '—'}
          </p>
        </div>
        <div className="kpi-card">
          <span className="label">Critical</span>
          <p className="kpi-number danger">{data.critical}</p>
          <span className="hint">{data.escalated} escalated</span>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Issues by category</h3>
          {data.by_category.map((c) => (
            <div key={c.name} className="bar-row">
              <span className="bar-label">{c.name}</span>
              <span className="bar" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
              <span className="bar-value">{c.count}</span>
            </div>
          ))}
        </div>

        <div className="chart-card">
          <h3>Last 7 days</h3>
          <div className="trend">
            {data.trend.map((d) => (
              <div key={d.date} className="trend-day">
                <div className="columns">
                  <span
                    className="col reported"
                    style={{ height: `${(d.reported / maxTrend) * 100}%` }}
                    title={`${d.reported} reported`}
                  />
                  <span
                    className="col resolved"
                    style={{ height: `${(d.resolved / maxTrend) * 100}%` }}
                    title={`${d.resolved} resolved`}
                  />
                </div>
                <span className="bar-label">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="legend">
            <span className="swatch reported" /> Reported
            <span className="swatch resolved" /> Resolved
          </div>
        </div>
      </div>

      {data.hotspots.length > 0 && (
        <div className="chart-card">
          <h3>Recurring hotspots</h3>
          {data.hotspots.map((h) => (
            <div key={`${h.lat}-${h.lng}`} className="bar-row">
              <span className="bar-label">{h.area}</span>
              <span className="bar danger" style={{ width: `${Math.min(h.reports * 12, 100)}%` }} />
              <span className="bar-value">{h.reports}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
