import React, { useState } from 'react';

export default function App() {
  const [page, setPage] = useState('home');
  const [reports, setReports] = useState([]);
  
  // Form and API states
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Analysis states
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Reset previous analysis if new photo selected
      setAnalyzed(false);
      setAnalysisResult(null);
    }
  };

  // Call real Flask backend endpoint
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

    try {
      const backendUrl = window.location.hostname.includes('app.github.dev')
  ? `https://${window.location.hostname.replace('-5173', '-8000')}/analyze`
  : 'http://localhost:8000/analyze';

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
      alert('Error connecting to Flask backend. Make sure Flask is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // Save report to frontend state and navigate to Dashboard
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
      location: location || 'Location Not Specified',
      description: description,
      status: 'Submitted',
      date: new Date().toLocaleDateString(),
      imagePreview: previewUrl,
    };

    setReports([newReport, ...reports]);

    // Reset Form
    setAnalyzed(false);
    setAnalysisResult(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setLocation('');
    setDescription('');
    
    // Switch to Dashboard
    setPage('reports');
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="logo" onClick={() => setPage('home')}>
          <span>Civic</span>
          <span className="badge">AI</span>
        </div>
        <div className="nav-links">
          <button 
            className={page === 'home' ? 'active' : ''} 
            onClick={() => setPage('home')}
          >
            Home
          </button>
          <button 
            className={page === 'report' ? 'active' : ''} 
            onClick={() => setPage('report')}
          >
            Report Issue
          </button>
          <button 
            className={page === 'reports' ? 'active' : ''} 
            onClick={() => setPage('reports')}
          >
            Dashboard ({reports.length})
          </button>
        </div>
      </nav>

      {/* PAGE 1: HOME */}
      {page === 'home' && (
        <div className="hero-section">
          <h1>AI-Powered Civic Issue Resolution</h1>
          <p>Report municipal issues effortlessly. AI classifies, prioritizes, and routes complaints automatically.</p>
          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => setPage('report')}>
              Report an Issue
            </button>
            <button className="secondary-btn" onClick={() => setPage('reports')}>
              View Reports
            </button>
          </div>
          
          <div className="feature-grid">
            <div className="feature-card">
              <h3>AI Detection</h3>
              <p>Gemini Vision automatically extracts issues directly from photos.</p>
            </div>
            <div className="feature-card">
              <h3>Smart Priority</h3>
              <p>Severity scoring tags urgent hazards for rapid municipal intervention.</p>
            </div>
            <div className="feature-card">
              <h3>Auto Routing</h3>
              <p>Complaints are immediately dispatched to the correct municipal department.</p>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: REPORT AN ISSUE */}
      {page === 'report' && (
        <div className="report-container">
          <h2>Report Civic Issue</h2>
          
          <div className="form-group">
            <label>Upload Issue Photo *</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} alt="Issue preview" style={{ maxWidth: '100%', maxHeight: '250px', marginTop: '10px', borderRadius: '8px' }} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Location Context</label>
            <input 
              type="text" 
              placeholder="e.g. Sector 18, Main Street Near Metro Gate 2" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Additional Details (Optional)</label>
            <textarea 
              placeholder="Provide any additional context..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {!analyzed ? (
            <button 
              className="primary-btn" 
              onClick={handleAnalyze} 
              disabled={loading}
            >
              {loading ? 'Analyzing with Gemini AI...' : 'Analyze with AI'}
            </button>
          ) : (
            <div className="analysis-card">
              <h3>AI Analysis Result</h3>
              <div className="analysis-grid">
                <div><strong>Issue:</strong> {analysisResult.issue}</div>
                <div><strong>Category:</strong> {analysisResult.category}</div>
                <div><strong>Severity:</strong> <span className={`severity-${analysisResult.severity.toLowerCase()}`}>{analysisResult.severity}</span></div>
                <div><strong>Confidence:</strong> {analysisResult.confidence}</div>
                <div><strong>Department:</strong> {analysisResult.department}</div>
              </div>

              <div className="complaint-box">
                <h4>AI-Generated Official Complaint</h4>
                <p>{analysisResult.complaint}</p>
              </div>

              <button className="success-btn" onClick={handleSubmitReport}>
                Submit Formal Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* PAGE 3: REPORTS DASHBOARD */}
      {page === 'reports' && (
        <div className="dashboard-container">
          <h2>Reported Issues Dashboard</h2>
          {reports.length === 0 ? (
            <p className="empty-state">No civic issues reported yet. Submit your first report above!</p>
          ) : (
            <div className="reports-grid">
              {reports.map((item) => (
                <div key={item.id} className="report-card">
                  <div className="report-header">
                    <span className="report-id">{item.id}</span>
                    <span className="report-date">{item.date}</span>
                  </div>
                  {item.imagePreview && (
                    <img src={item.imagePreview} alt="Reported issue" className="report-card-img" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }} />
                  )}
                  <h3>{item.issue}</h3>
                  <div className="report-meta">
                    <p><strong>Category:</strong> {item.category}</p>
                    <p><strong>Severity:</strong> {item.severity}</p>
                    <p><strong>Department:</strong> {item.department}</p>
                    <p><strong>Location:</strong> {item.location}</p>
                  </div>
                  <div className="report-complaint">
                    <p>{item.complaint}</p>
                  </div>
                  <div className="report-footer">
                    <span className="status-badge">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}