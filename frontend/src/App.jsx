import React, { useState } from 'react';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon Anchors for Webpack / Vite
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Sub-Component: Interactive Geospatial Incident Map
// Sub-Component: Interactive Geospatial Incident Map
function IncidentMap({ incidents }) {
  const defaultCenter = [28.6139, 77.2090];
  const [showHeatmap, setShowHeatmap] = useState(false);

  return (
    <div style={{ position: 'relative', height: '340px', width: '100%', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: '#ffffff', padding: '6px 12px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input 
          type="checkbox" 
          id="heatmapToggle" 
          checked={showHeatmap} 
          onChange={(e) => setShowHeatmap(e.target.checked)} 
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor="heatmapToggle" style={{ cursor: 'pointer' }}>🔥 Density / Heatmap Mode</label>
      </div>

      <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />

        {showHeatmap ? (
          /* Render Heatmap Circles when showHeatmap is checked */
          incidents.map((incident) => {
            const position = incident.coords || [28.6139, 77.2090];
            const isCritical = incident.severity === 'Critical' || incident.severity === 'High';
            return (
              <React.Fragment key={`heat-${incident.id}`}>
                {/* Outer heat aura */}
                <Circle
                  center={position}
                  radius={isCritical ? 1500 : 800}
                  pathOptions={{ color: 'transparent', fillColor: isCritical ? '#ef4444' : '#f59e0b', fillOpacity: 0.35 }}
                />
                {/* Inner intense heat core */}
                <Circle
                  center={position}
                  radius={isCritical ? 600 : 300}
                  pathOptions={{ color: 'transparent', fillColor: isCritical ? '#dc2626' : '#d97706', fillOpacity: 0.7 }}
                >
                  <Popup>
                    <div style={{ padding: '4px' }}>
                      <strong style={{ color: '#dc2626' }}>🔥 High Incident Density Area</strong><br />
                      <span>{incident.issue || incident.complaint}</span>
                    </div>
                  </Popup>
                </Circle>
              </React.Fragment>
            );
          })
        ) : (
          /* Render Normal Pins when unchecked */
          incidents.map((incident) => {
            const position = incident.coords || [28.6139, 77.2090];
            return (
              <Marker key={incident.id} position={position}>
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <strong>{incident.id}</strong><br />
                    <span>{incident.issue || incident.complaint}</span><br />
                    <span style={{ color: (incident.severity === 'Critical' || incident.severity === 'High') ? '#dc2626' : '#d97706', fontWeight: 'bold' }}>
                      {incident.severity} Priority
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}
      </MapContainer>
    </div>
  );
}

// Main CivicAI Application
export default function App() {
  // Navigation & Role State
  const [role, setRole] = useState('citizen'); // 'citizen' or 'admin'
  const [page, setPage] = useState('home');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Real-Time Alert & AI Action Plan State
  const [notification, setNotification] = useState(null);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  
  // Seed initial reports so the Official view looks active immediately
  const [reports, setReports] = useState([
    {
      id: 'CIV-8092',
      issue: 'Open Sewage Overflow',
      category: 'Drainage',
      severity: 'Critical',
      confidence: '98%',
      department: 'Water & Sewage Board',
      location: 'Block C, Sector 14',
      description: 'Severe sewage leakage overflowing onto public walkway.',
      complaint: 'An open sewage leakage has overflowed onto the public walkway in Block C, Sector 14, posing an immediate biological hazard to residents. Urgent intervention is required to repair the main drain and sanitize the area.',
      status: 'Submitted',
      date: '09/19/2026',
      notes: '',
      coords: [28.6139, 77.2090],
      imagePreview: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'CIV-4102',
      issue: 'Broken Streetlight Array',
      category: 'Street Lighting',
      severity: 'Medium',
      confidence: '91%',
      department: 'Electrical Department',
      location: 'Main Road Gate 3',
      description: 'Multiple streetlights non-functional creating dark spot.',
      complaint: 'Three consecutive streetlights near Main Road Gate 3 are completely dark, causing safety concerns for nighttime pedestrians. Maintenance required to replace broken fixtures.',
      status: 'In Progress',
      date: '09/18/2026',
      notes: 'Work order #992 generated. Technician dispatched.',
      coords: [28.6200, 77.2150],
      imagePreview: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&w=600&q=80'
    }
  ]);

  // Form and API states
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // AI Analysis states
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Calls Gemini API to generate dispatch instructions
  const handleGenerateAIPlan = async (incident) => {
    setLoadingPlanId(incident.id);
    
    // Dynamic URL for Codespaces vs Localhost
    const BASE_URL = 'https://civicai-backend-nbys.onrender.com';

const backendUrl = window.location.hostname.includes('app.github.dev')
  ? `https://${window.location.hostname.replace('-5173', '-8000')}/api/generate-action-plan`
  : window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api/generate-action-plan'
  : `${BASE_URL}/api/generate-action-plan`;

    try {
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: incident.issue || incident.category,
          description: incident.complaint || incident.description,
          department: incident.department || 'Public Works'
        })
      });
      const data = await res.json();
      if (data.action_plan) {
        alert(`🤖 Gemini Recommended Action Plan:\n\n${data.action_plan}`);
      } else {
        alert(data.error || 'Could not generate action plan.');
      }
    } catch (err) {
      console.error('Error generating AI plan:', err);
      alert('Failed to connect to backend for action plan generation.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  // Helper to trigger notification banner when status is changed
  const triggerNotification = (incidentId, newStatus) => {
    setNotification(`🔔 Real-time Dispatch Alert: Ticket ${incidentId} updated to "${newStatus}". Citizen notified via SMS/App.`);
    setTimeout(() => setNotification(null), 5000);
  };

  // File Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalyzed(false);
      setAnalysisResult(null);
    }
  };

  // Dynamic Codespaces-aware Backend Call
  const handleAnalyze = async () => {
    if (!selectedFile) {
      alert('Please select an issue image first.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('location', location);
    formData.append('description', description);

    const backendUrl = window.location.hostname.includes('app.github.dev')
      ? `https://${window.location.hostname.replace('-5173', '-8000')}/analyze`
      : 'http://localhost:8000/analyze';

    try {
      const res = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
        setAnalyzed(true);
      } else {
        alert(data.error || 'Failed to analyze image with AI.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to Flask backend. Ensure Flask is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Report
  const handleSubmitReport = () => {
    if (!analysisResult) return;

    const newReport = {
      id: `CIV-${Math.floor(1000 + Math.random() * 9000)}`,
      issue: analysisResult.issue,
      category: analysisResult.category,
      severity: analysisResult.severity,
      confidence: analysisResult.confidence,
      department: analysisResult.department,
      complaint: analysisResult.complaint,
      location: location || 'Unspecified Location',
      description: description,
      status: 'Submitted',
      date: new Date().toLocaleDateString(),
      notes: '',
      coords: [28.6139 + (Math.random() - 0.5) * 0.02, 77.2090 + (Math.random() - 0.5) * 0.02],
      imagePreview: previewUrl,
    };

    setReports([newReport, ...reports]);
    setAnalyzed(false);
    setAnalysisResult(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setLocation('');
    setDescription('');
    setPage('reports');
  };

  // Admin Actions: Update Status & Resolution Notes
  const handleStatusChange = (id, newStatus) => {
    setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
    triggerNotification(id, newStatus);
  };

  const handleNoteChange = (id, noteText) => {
    setReports(reports.map(r => r.id === id ? { ...r, notes: noteText } : r));
  };

  // Filtered Reports for Admin View
  const filteredReports = departmentFilter === 'All' 
    ? reports 
    : reports.filter(r => r.department.toLowerCase().includes(departmentFilter.toLowerCase()));

  // KPI Calculations
  const criticalCount = reports.filter(r => r.severity === 'Critical' || r.severity === 'High').length;
  const pendingCount = reports.filter(r => r.status === 'Submitted').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;

  return (
    <div className="app-container">
      {/* Real-time Dispatch Notification Toast Banner */}
      {notification && (
        <div style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600' }}>
          {notification}
        </div>
      )}

      {/* Top Bar with Role Switcher */}
      <nav className="navbar">
        <div className="logo" onClick={() => setPage('home')}>
          <span>Civic</span>
          <span className="badge">AI Engine</span>
        </div>

        {/* Portal Switcher Pill */}
        <div className="role-switcher">
          <button 
            className={`role-btn ${role === 'citizen' ? 'active-role' : ''}`}
            onClick={() => { setRole('citizen'); setPage('home'); }}
          >
            Citizen Portal
          </button>
          <button 
            className={`role-btn ${role === 'admin' ? 'active-role' : ''}`}
            onClick={() => { setRole('admin'); setPage('admin-dashboard'); }}
          >
            City Official Portal 🏛️
          </button>
        </div>

        <div className="nav-links">
          {role === 'citizen' ? (
            <>
              <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>Home</button>
              <button className={page === 'report' ? 'active' : ''} onClick={() => setPage('report')}>Report Issue</button>
              <button className={page === 'reports' ? 'active' : ''} onClick={() => setPage('reports')}>My Reports ({reports.length})</button>
            </>
          ) : (
            <button className="active">Command Center</button>
          )}
        </div>
      </nav>

      {/* CITIZEN PORTAL */}
      {role === 'citizen' && (
        <>
          {page === 'home' && (
            <div className="hero-section">
              <h1>AI-Powered Civic Infrastructure Resolution</h1>
              <p>Instant visual analysis, automated official complaint drafting, and direct routing to municipal departments.</p>
              <div className="hero-buttons">
                <button className="primary-btn" onClick={() => setPage('report')}>Report an Issue</button>
                <button className="secondary-btn" onClick={() => setPage('reports')}>View Public Feed</button>
              </div>
              <div className="feature-grid">
                <div className="feature-card">
                  <h3>Gemini Vision AI</h3>
                  <p>Extracts issue type, physical damage scope, and context directly from photos.</p>
                </div>
                <div className="feature-card">
                  <h3>Automated Priority Triage</h3>
                  <p>Assigns severity scores to fast-track safety hazards like open sewage or road collapses.</p>
                </div>
                <div className="feature-card">
                  <h3>City Official Dispatch</h3>
                  <p>Generates structured municipal complaints dispatched straight to department heads.</p>
                </div>
              </div>
            </div>
          )}

          {page === 'report' && (
            <div className="report-container">
              <h2>Submit Civic Issue</h2>
              <div className="form-group">
                <label>Upload Photo Evidence *</label>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {previewUrl && (
                  <div className="image-preview">
                    <img src={previewUrl} alt="Issue preview" style={{ maxWidth: '100%', maxHeight: '220px', marginTop: '10px', borderRadius: '8px' }} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Location Context</label>
                <input type="text" placeholder="e.g., Sector 14, Opposite City Park Gate" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Additional Notes (Optional)</label>
                <textarea placeholder="Provide any extra details..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {!analyzed ? (
                <button className="primary-btn" onClick={handleAnalyze} disabled={loading}>
                  {loading ? 'Analyzing Vision Bytes with Gemini AI...' : 'Analyze Issue with AI'}
                </button>
              ) : (
                <div className="analysis-card">
                  <h3>Gemini Vision Analysis Complete</h3>
                  <div className="analysis-grid">
                    <div><strong>Detected Issue:</strong> {analysisResult.issue}</div>
                    <div><strong>Category:</strong> {analysisResult.category}</div>
                    <div><strong>Severity:</strong> <span className={`severity-${analysisResult.severity.toLowerCase()}`}>{analysisResult.severity}</span></div>
                    <div><strong>AI Confidence:</strong> {analysisResult.confidence}</div>
                    <div><strong>Target Dept:</strong> {analysisResult.department}</div>
                  </div>

                  <div className="complaint-box">
                    <h4>Generated Official Complaint Draft</h4>
                    <p>{analysisResult.complaint}</p>
                  </div>

                  <button className="success-btn" onClick={handleSubmitReport}>
                    Submit Formal Complaint
                  </button>
                </div>
              )}
            </div>
          )}

          {page === 'reports' && (
            <div className="dashboard-container">
              <h2>Public Issues Feed</h2>
              <div className="reports-grid">
                {reports.map((item) => (
                  <div key={item.id} className="report-card">
                    <div className="report-header">
                      <span className="report-id">{item.id}</span>
                      <span className="report-date">{item.date}</span>
                    </div>
                    {item.imagePreview && <img src={item.imagePreview} alt="Issue" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }} />}
                    <h3>{item.issue}</h3>
                    <div className="report-meta">
                      <p><strong>Category:</strong> {item.category}</p>
                      <p><strong>Severity:</strong> <span className={`severity-${item.severity.toLowerCase()}`}>{item.severity}</span></p>
                      <p><strong>Department:</strong> {item.department}</p>
                      <p><strong>Location:</strong> {item.location}</p>
                    </div>
                    <div className="report-complaint">
                      <p>{item.complaint}</p>
                    </div>
                    {item.notes && (
                      <div className="admin-notes-box">
                        <strong>Official Update:</strong> {item.notes}
                      </div>
                    )}
                    <div className="report-footer">
                      <span className={`status-badge status-${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* CITY OFFICIAL / ADMIN PORTAL */}
      {role === 'admin' && (
        <div className="admin-container">
          {/* Executive Analytics Metrics */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <h4>Total Incidents</h4>
              <p className="kpi-number">{reports.length}</p>
            </div>
            <div className="kpi-card warning">
              <h4>High/Critical Hazards</h4>
              <p className="kpi-number">{criticalCount}</p>
            </div>
            <div className="kpi-card danger">
              <h4>Action Required</h4>
              <p className="kpi-number">{pendingCount}</p>
            </div>
            <div className="kpi-card success">
              <h4>Resolved Issues</h4>
              <p className="kpi-number">{resolvedCount}</p>
            </div>
          </div>

          {/* Interactive Geospatial Map */}
          <IncidentMap incidents={reports} />

          {/* Department Filter Bar */}
          <div className="admin-filter-bar">
            <h3>Municipal Triage Dashboard</h3>
            <div className="filter-group">
              <label>Filter by Department: </label>
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <option value="All">All Departments</option>
                <option value="Public Works">Public Works Department</option>
                <option value="Water">Water & Sewage Board</option>
                <option value="Electrical">Electrical Department</option>
                <option value="Waste">Waste Management</option>
              </select>
            </div>
          </div>

          {/* Official Action Table */}
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Report ID & Date</th>
                  <th>Visual Evidence</th>
                  <th>AI Assessment & Location</th>
                  <th>Official Complaint Summary</th>
                  <th>Department & Status Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.id}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.date}</div>
                    </td>
                    <td>
                      {r.imagePreview && <img src={r.imagePreview} alt="Evidence" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />}
                    </td>
                    <td>
                      <strong>{r.issue}</strong>
                      <div><span className={`severity-${r.severity.toLowerCase()}`}>{r.severity} Priority</span></div>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>📍 {r.location}</div>
                    </td>
                    <td style={{ maxWidth: '300px', fontSize: '0.85rem' }}>
                      <p>{r.complaint}</p>
                    </td>
                    <td>
                      <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>{r.department}</div>
                      
                      {/* Status Selector */}
                      <select 
                        value={r.status} 
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="Submitted">Submitted (Pending)</option>
                        <option value="In Progress">In Progress (Dispatched)</option>
                        <option value="Resolved">Resolved (Closed)</option>
                      </select>

                      {/* Official Resolution Note */}
                      <input 
                        type="text"
                        placeholder="Add resolution details..."
                        value={r.notes}
                        onChange={(e) => handleNoteChange(r.id, e.target.value)}
                        className="note-input"
                      />

                      {/* AI Action Plan Generator Trigger */}
                      <button 
                        onClick={() => handleGenerateAIPlan(r)}
                        style={{ marginTop: '8px', width: '100%', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {loadingPlanId === r.id ? '⚡ Generating Plan...' : '🤖 AI Recommended Action'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}