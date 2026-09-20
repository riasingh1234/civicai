import { useEffect, useState } from 'react';
import { api, imageUrl } from '../lib/api';

// The demo has no login, so "my reports" is whatever this browser filed.
const KEY = 'civicai.my-reports';

export function readMine() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function rememberReport(id) {
  const ids = readMine();
  if (!ids.includes(id)) {
    localStorage.setItem(KEY, JSON.stringify([id, ...ids]));
  }
}

const STEPS = ['Submitted', 'In Progress', 'Resolved'];

function Tracker({ status }) {
  const at = STEPS.indexOf(status);
  return (
    <ol className="tracker">
      {STEPS.map((step, i) => (
        <li key={step} className={i <= at ? 'reached' : ''}>
          <span className="dot" />
          {step}
        </li>
      ))}
    </ol>
  );
}

export default function MyReports({ reports }) {
  const [mine, setMine] = useState(readMine);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setMine(readMine());
  }, [reports]);

  useEffect(() => {
    if (!mine.length) return;
    let cancelled = false;

    async function load() {
      try {
        const rows = await api.notifications(mine);
        if (!cancelled) setNotifications(rows);
      } catch {
        // A missing feed shouldn't take the page down.
      }
    }

    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mine]);

  const rows = (reports || []).filter((r) => mine.includes(r.id));
  const unread = notifications.filter((n) => !n.read);

  async function clearUnread() {
    const ids = unread.map((n) => n.id);
    if (!ids.length) return;
    await api.markRead(ids);
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
  }

  if (!mine.length) {
    return (
      <div className="dashboard-container">
        <h2>My reports</h2>
        <p className="hint">Nothing filed from this device yet.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="section-head">
        <h2>My reports</h2>
        {unread.length > 0 && (
          <button className="link-btn" onClick={clearUnread}>
            Mark {unread.length} update{unread.length > 1 ? 's' : ''} read
          </button>
        )}
      </div>

      {rows.map((r) => (
        <div key={r.id} className="tracked-report">
          <div className="officer-head">
            <div>
              <span className="report-id">{r.id}</span>
              <h3>{r.issue}</h3>
              <p className="hint">{r.address || r.location}</p>
            </div>
            <span className="chip">Priority {r.priority?.score}</span>
          </div>

          <Tracker status={r.status} />

          {r.support_count > 1 && (
            <p className="hint">{r.support_count} citizens have reported this issue.</p>
          )}

          {r.after_image_url && (
            <div className="evidence-pair">
              <figure>
                <img src={imageUrl(r.image_url)} alt="" />
                <figcaption>Before</figcaption>
              </figure>
              <figure>
                <img src={imageUrl(r.after_image_url)} alt="" />
                <figcaption>After</figcaption>
              </figure>
            </div>
          )}

          {r.verification?.verified && (
            <p className="verification pass">
              Repair visually verified at {r.verification.confidence}% confidence.
            </p>
          )}
        </div>
      ))}

      <h3 className="queue-heading">Updates</h3>
      {notifications.length === 0 && <p className="hint">No updates yet.</p>}
      <ul className="notification-list">
        {notifications.map((n) => (
          <li key={n.id} className={n.read ? '' : 'unread'}>
            <span className="when">{new Date(n.created_at).toLocaleString()}</span>
            {n.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
