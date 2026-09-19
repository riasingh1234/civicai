const LABELS = {
  severity: 'Severity',
  public_safety_risk: 'Public safety risk',
  location_sensitivity: 'Location sensitivity',
  similar_reports: 'Similar reports nearby',
  time_unresolved: 'Time unresolved',
};

function band(score) {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

// A score is only useful if someone can argue with it, so the breakdown is one
// click away rather than hidden in a tooltip.
export default function PriorityMeter({ priority, escalated, compact = false }) {
  if (!priority) return null;

  const { score, response_window: window, reasons, components } = priority;

  if (compact) {
    return (
      <span className={`priority-chip band-${band(score)}`} title={reasons.join(' · ')}>
        {score}
      </span>
    );
  }

  return (
    <div className={`priority-meter band-${band(score)}`}>
      <div className="priority-head">
        <div>
          <span className="priority-score">{score}</span>
          <span className="priority-outof">/100</span>
        </div>
        <div className="priority-window">
          <span>Respond {window.toLowerCase()}</span>
          {escalated && <span className="escalation-tag">Escalated</span>}
        </div>
      </div>

      <div className="priority-bar">
        <span style={{ width: `${score}%` }} />
      </div>

      <ul className="priority-reasons">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <details className="priority-detail">
        <summary>How this was calculated</summary>
        <table>
          <tbody>
            {Object.entries(components).map(([key, points]) => (
              <tr key={key}>
                <td>{LABELS[key] || key}</td>
                <td>+{points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
