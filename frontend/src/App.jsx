import React, { useState } from 'react';

export default function App() {
  // Navigation & Role State
  const [role, setRole] = useState('citizen'); // 'citizen' or 'admin'
  const [page, setPage] = useState('home');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  
  // Seed initial reports so the Admin view looks active immediately
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