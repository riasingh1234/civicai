import { useCallback, useEffect, useState } from 'react';
import { api } from './lib/api';
import { t, LANGS } from './lib/i18n';
import ReportForm from './components/ReportForm';
import OfficerDashboard from './components/AdminDashboard';
import Analytics from './components/Analytics';
import IncidentMap from './components/IncidentMap';
import './App.css';

export default function App() {
  const [role, setRole] = useState('citizen');
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState('en');

  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, stats] = await Promise.all([api.listReports(), api.analytics()]);
      setReports(rows);
      setAnalytics(stats);
    } catch (e) {
      setBanner({ kind: 'error', text: `Backend unreachable: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Officers need a queue that moves without a manual reload.
  useEffect(() => {
    if (role !== 'official') return;
    const timer = setInterval(refresh, 20000);
    return () => clearInterval(timer);
  }, [role, refresh]);

  function handleSubmitted(result, mergedInto) {
    if (mergedInto) {
      rememberReport(result.report.id);
      setBanner({
        kind: 'ok',
        text: `Added to ${mergedInto}. Your report now backs an existing issue.`,
      });
    } else {
      rememberReport(result.id);
      setBanner({ kind: 'ok', text: `Complaint ${result.id} filed and routed to ${result.department}.` });
    }
    setPage('mine');
    refresh();
  }

  function handleUpdated(updated) {
    setReports((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    api.analytics().then(setAnalytics).catch(() => {});
  }

  const citizenPages = [
    ['report', t(lang, 'reportIssue')],
    ['feed', t(lang, 'publicFeed')],
    ['mine', t(lang, 'myReports')],
  ];

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo" onClick={() => setPage('home')}>
          CivicAI <span className="badge">SIH</span>
        </div>

        <div className="nav-links">
          {role === 'citizen' ? (
            citizenPages.map(([key, label]) => (
              <button
                key={key}
                className={page === key ? 'active' : ''}
                onClick={() => setPage(key)}
              >
                {label}
              </button>
            ))
          ) : (
            <>
              <button className={page === 'queue' ? 'active' : ''} onClick={() => setPage('queue')}>
                {t(lang, 'commandCenter')}
              </button>
              <button
                className={page === 'analytics' ? 'active' : ''}
                onClick={() => setPage('analytics')}
              >
                Analytics
              </button>
            </>
          )}
        </div>

        <div className="nav-right">
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="lang-select">
            {Object.entries(LANGS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>

          <div className="role-switcher">
            <button
              className={role === 'citizen' ? 'active' : ''}
              onClick={() => {
                setRole('citizen');
                setPage('home');
              }}
            >
              {t(lang, 'citizen')}
            </button>
            <button
              className={role === 'official' ? 'active' : ''}
              onClick={() => {
                setRole('official');
                setPage('queue');
              }}
            >
              {t(lang, 'official')}
            </button>
          </div>
        </div>
      </nav>

      {banner && (
        <div className={`banner ${banner.kind}`} onClick={() => setBanner(null)}>
          {banner.text}
        </div>
      )}

      {role === 'citizen' && page === 'home' && (
        <div className="hero-section">
          <h1>Civic issues, triaged by AI and tracked to closure.</h1>
          <p>{t(lang, 'tagline')}</p>

          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => setPage('report')}>
              {t(lang, 'reportIssue')}
            </button>
            <button className="secondary-btn" onClick={() => setPage('feed')}>
              {t(lang, 'publicFeed')}
            </button>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <h3>Duplicate detection</h3>
              <p>
                Photo similarity and location proximity are scored together, so a hundred reports
                about one pothole become one prioritised incident.
              </p>
            </div>
            <div className="feature-card">
              <h3>Explainable priority</h3>
              <p>
                Every score breaks down into severity, safety risk, location sensitivity, crowd
                support and time waiting.
              </p>
            </div>
            <div className="feature-card">
              <h3>Verified closure</h3>
              <p>
                Departments upload a completion photo and the model compares it against the original
                before the complaint can close.
              </p>
            </div>
          </div>
        </div>
      )}

      {role === 'citizen' && page === 'report' && (
        <ReportForm lang={lang} onSubmitted={handleSubmitted} />
      )}

      {role === 'citizen' && page === 'mine' && <MyReports reports={reports} />}

      {role === 'citizen' && page === 'feed' && (
        <div className="dashboard-container">
          <h2>{t(lang, 'publicFeed')}</h2>
          <IncidentMap reports={reports} hotspots={analytics?.hotspots || []} />
          <div className="reports-grid">
            {reports.map((r) => (
              <div key={r.id} className="report-card">
                <div className="report-header">
                  <span className="report-id">{r.id}</span>
                  <span className={`status status-${r.status.replace(/\s/g, '-').toLowerCase()}`}>
                    {r.status}
                  </span>
                </div>
                <h3>{r.issue}</h3>
                <p className="hint">{r.address || r.location}</p>
                <div className="report-meta">
                  <span className={`sev sev-${(r.severity || '').toLowerCase()}`}>{r.severity}</span>
                  <span className="chip">{r.category}</span>
                  {r.support_count > 1 && <span className="chip">{r.support_count} reports</span>}
                </div>
                <p className="report-complaint">{r.complaint}</p>
              </div>
            ))}
            {!reports.length && !loading && <p className="hint">{t(lang, 'noReports')}</p>}
          </div>
        </div>
      )}

      {role === 'official' && page === 'queue' && (
        <OfficerDashboard
          reports={reports}
          hotspots={analytics?.hotspots || []}
          onUpdated={handleUpdated}
          loading={loading}
        />
      )}

      {role === 'official' && page === 'analytics' && <Analytics data={analytics} />}
    </div>
  );
}
