import { useState } from 'react';
import { api, imageUrl } from '../lib/api';
import Analytics from './Analytics';
import IncidentMap from './IncidentMap';
import PriorityMeter from './PriorityMeter';
import ResolutionVerifier from './ResolutionVerifier';

const DEPARTMENTS = ['All', 'Public Works', 'Water', 'Electrical', 'Waste', 'Public Safety'];

export default function AdminDashboard({ reports, analytics, onReportChanged }) {
  const [department, setDepartment] = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [planFor, setPlanFor] = useState(null);
  const [plan, setPlan] = useState(null);
  const [verifying, setVerifying] = useState(null);

  const rows = reports.filter(
    (r) =>
      department === 'All' ||
      (r.department || '').toLowerCase().includes(department.toLowerCase())
  );

  const escalated = reports.filter((r) => r.escalated && r.status !== 'Resolved');

  async function changeStatus(report, status) {
    onReportChanged(await api.updateReport(report.id, { status }));
  }

  async function saveNote(report, resolutionNote) {
    onReportChanged(await api.updateReport(report.id, { resolution_note: resolutionNote }));
  }

  async function generatePlan(report) {
    setPlanFor(report.id);
    setPlan(null);
    try {
      const data = await api.actionPlan({
        title: report.issue,
        description: report.complaint,
        department: report.department,
        priority: report.priority?.score,
      });
      setPlan({ id: report.id, text: data.action_plan });
    } catch (e) {
      setPlan({ id: report.id, text: e.message });
    } finally {
      setPlanFor(null);
    }
  }

  return (
    <div className="admin-container">
      {escalated.length > 0 && (
        <div className="escalation-strip">
          <h3>Needs attention now</h3>
          {escalated.map((r) => (
            <div key={r.id} className="escalation-row">
              <PriorityMeter priority={r.priority} escalated compact />
              <div>
                <strong>{r.issue}</strong>
                <p className="hint">
                  {r.id} · {r.address || r.location} · respond{' '}
                  {r.priority.response_window.toLowerCase()}
                </p>
              </div>
              <button className="secondary-btn" onClick={() => setExpanded(r.id)}>
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      <Analytics data={analytics} />

      <IncidentMap incidents={reports} hotspots={analytics?.hotspots || []} />

      <div className="admin-filter-bar">
        <h3>Triage queue</h3>
        <div className="filter-group">
          <label htmlFor="dept">Department</label>
          <select id="dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All departments' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="queue">
        {rows.map((r) => (
          <article key={r.id} className={`queue-item ${expanded === r.id ? 'open' : ''}`}>
            <header onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              <PriorityMeter priority={r.priority} escalated={r.escalated} compact />
              {r.image_url && <img className="thumb" src={imageUrl(r.image_url)} alt="" />}
              <div className="queue-summary">
                <strong>{r.issue}</strong>
                <p className="hint">
                  {r.id} · {r.address || r.location}
                </p>
                <p className="hint">
                  {r.department} · {r.support_count} report{r.support_count > 1 ? 's' : ''} ·
                  confidence {r.community_confidence.toLowerCase()}
                </p>
              </div>
              <span className={`status-badge status-${r.status.toLowerCase().replace(' ', '-')}`}>
                {r.status}
              </span>
            </header>

            {expanded === r.id && (
              <div className="queue-detail">
                <PriorityMeter priority={r.priority} escalated={r.escalated} />

                <div className="routing-box">
                  <h4>Routed to {r.department}</h4>
                  <p>{r.routing_reason || 'No routing explanation was recorded for this report.'}</p>
                </div>

                <p className="complaint-text">{r.complaint}</p>

                {r.support_count > 1 && (
                  <div className="evidence-strip">
                    <h4>{r.support_count} citizens reported this</h4>
                    <div className="evidence-thumbs">
                      {[r.image_url, ...r.supporting_images].filter(Boolean).map((src, i) => (
                        <img key={`${src}-${i}`} src={imageUrl(src)} alt="" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="queue-actions">
                  <select value={r.status} onChange={(e) => changeStatus(r, e.target.value)}>
                    <option value="Submitted">Submitted</option>
                    <option value="In Progress">In progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>

                  <input
                    type="text"
                    defaultValue={r.resolution_note}
                    placeholder="Note for the citizen"
                    onBlur={(e) => {
                      if (e.target.value !== r.resolution_note) saveNote(r, e.target.value);
                    }}
                  />

                  <button className="secondary-btn" onClick={() => generatePlan(r)}>
                    {planFor === r.id ? 'Writing work order…' : 'Draft work order'}
                  </button>

                  <button className="primary-btn" onClick={() => setVerifying(r)}>
                    Verify completion
                  </button>
                </div>

                {plan?.id === r.id && <div className="action-plan">{plan.text}</div>}

                {r.verification && (
                  <div className={`verify-result ${r.verification.verified ? 'ok' : 'warn'}`}>
                    <strong>
                      {r.verification.verified
                        ? `Verified at ${r.verification.confidence}% confidence`
                        : 'Completion photo did not pass verification'}
                    </strong>
                    <p>{r.verification.observation}</p>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {verifying && (
        <ResolutionVerifier
          report={verifying}
          onDone={(updated) => { onReportChanged(updated); setVerifying(null); }}
          onClose={() => setVerifying(null)}
        />
      )}
    </div>
  );
}