import { imageUrl } from '../lib/api';

// Shown between analysis and submission. The citizen decides - we never merge
// silently, because a wrong auto-merge loses a genuine complaint.
export default function DuplicateNotice({ matches, selected, onSelect }) {
  if (!matches?.length) return null;

  return (
    <div className="duplicate-panel">
      <h4>Similar issue already reported nearby</h4>
      <p className="hint">
        {matches.length === 1 ? 'One open report' : `${matches.length} open reports`} match what
        you are describing. Adding your report to an existing one raises its priority instead of
        creating a queue of repeats.
      </p>

      {matches.map((m) => (
        <div
          key={m.report_id}
          className={`duplicate-card ${selected === m.report_id ? 'chosen' : ''}`}
          onClick={() => onSelect(m.report_id)}
        >
          {m.image_url && <img src={imageUrl(m.image_url)} alt="" />}

          <div className="duplicate-body">
            <div className="duplicate-head">
              <strong>{m.issue}</strong>
              <span className="similarity">{m.similarity}% match</span>
            </div>
            <p className="hint">
              {m.report_id} · {m.distance_m} m away · {m.status}
            </p>
            <p className="hint">{m.location}</p>

            <div className="score-breakdown">
              <span>Visual {m.breakdown.visual}%</span>
              <span>Proximity {m.breakdown.proximity}%</span>
              <span>{m.breakdown.category_match ? 'Same category' : 'Different category'}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="duplicate-actions">
        <button
          type="button"
          className={selected ? 'primary-btn' : 'secondary-btn'}
          onClick={() => onSelect(matches[0].report_id)}
        >
          Add to existing issue
        </button>
        <button
          type="button"
          className={selected ? 'secondary-btn' : 'primary-btn'}
          onClick={() => onSelect(null)}
        >
          This is a separate issue
        </button>
      </div>
    </div>
  );
}
