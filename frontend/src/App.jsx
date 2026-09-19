import { useState } from "react"

function App() {
  const [page, setPage] = useState("home")
  const [analyzed, setAnalyzed] = useState(false)
  const [reports, setReports] = useState([])

  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")

  const analyzeIssue = () => {
    setAnalyzed(true)
  }

  const submitReport = () => {
    const newReport = {
      id: "CIV-" + Math.floor(1000 + Math.random() * 9000),
      issue: "Pothole Detected",
      category: "Road Infrastructure",
      severity: "High",
      confidence: "94%",
      department: "Road Maintenance",
      location: location || "Location not provided",
      description:
        description ||
        "Large pothole detected on the reported road.",
      status: "Submitted",
      date: new Date().toLocaleDateString()
    }

    setReports([newReport, ...reports])
    setPage("reports")
    setAnalyzed(false)
    setLocation("")
    setDescription("")
  }

  if (page === "report") {
    return (
      <div>
        <nav>
          <h2>CivicAI</h2>

          <div>
            <a href="#" onClick={() => setPage("home")}>Home</a>
            <a href="#">How It Works</a>
            <a href="#" onClick={() => setPage("reports")}>
              Reports
            </a>
          </div>
        </nav>

        <main className="report-page">
          <section className="report-container">

            <div className="report-header">
              <p>REPORT A CIVIC ISSUE</p>

              <h1>Tell us what's happening.</h1>

              <span>
                Upload a photo and provide some basic information.
                CivicAI will analyze the issue and prepare your report.
              </span>
            </div>

            <div className="upload-box">
              <div className="upload-icon">+</div>

              <h3>Upload Issue Photo</h3>

              <p>
                Choose a clear photo of the civic problem
              </p>

              <input type="file" accept="image/*" />
            </div>

            <div className="form-group">
              <label>Location</label>

              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter the location of the issue"
              />
            </div>

            <div className="form-group">
              <label>Description</label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in a few words..."
                rows="5"
              ></textarea>
            </div>

            <div className="action-buttons">

              <button onClick={analyzeIssue}>
                Analyze with AI →
              </button>

              <button
                className="secondary-button"
                onClick={() => setPage("home")}
              >
                Back
              </button>

            </div>

            {analyzed && (
              <div className="analysis-card">

                <p className="analysis-label">
                  AI ANALYSIS COMPLETE
                </p>

                <h2>Pothole Detected</h2>

                <p className="analysis-description">
                  CivicAI identified a road infrastructure issue
                  from the uploaded image.
                </p>

                <div className="analysis-grid">

                  <div>
                    <span>Category</span>
                    <strong>Road Infrastructure</strong>
                  </div>

                  <div>
                    <span>Severity</span>
                    <strong className="high">High</strong>
                  </div>

                  <div>
                    <span>Confidence</span>
                    <strong>94%</strong>
                  </div>

                  <div>
                    <span>Department</span>
                    <strong>Road Maintenance</strong>
                  </div>

                </div>

                <div className="complaint-box">

                  <h3>AI Generated Complaint</h3>

                  <p>
                    Large pothole detected on the reported road,
                    potentially creating a safety hazard for vehicles
                    and pedestrians.
                  </p>

                </div>

                <button
                  className="submit-button"
                  onClick={submitReport}
                >
                  Submit Report
                </button>

              </div>
            )}

          </section>
        </main>
      </div>
    )
  }

  if (page === "reports") {
    return (
      <div>
        <nav>
          <h2>CivicAI</h2>

          <div>
            <a href="#" onClick={() => setPage("home")}>Home</a>

            <a href="#">How It Works</a>

            <a href="#" onClick={() => setPage("reports")}>
              Reports
            </a>

            <button onClick={() => setPage("report")}>
              Report an Issue
            </button>
          </div>
        </nav>

        <main>

          <section>
            <p>CIVIC ISSUE DASHBOARD</p>

            <h1>Reported Issues</h1>

            <p>
              Track civic problems reported through CivicAI.
            </p>
          </section>

          {reports.length === 0 ? (

            <div className="analysis-card">
              <h2>No reports yet</h2>

              <p className="analysis-description">
                Civic issues submitted through the reporting
                system will appear here.
              </p>

              <button onClick={() => setPage("report")}>
                Create First Report →
              </button>
            </div>

          ) : (

            <div>

              {reports.map((report) => (

                <div className="analysis-card" key={report.id}>

                  <p className="analysis-label">
                    {report.id}
                  </p>

                  <h2>{report.issue}</h2>

                  <p className="analysis-description">
                    {report.description}
                  </p>

                  <div className="analysis-grid">

                    <div>
                      <span>Category</span>
                      <strong>{report.category}</strong>
                    </div>

                    <div>
                      <span>Severity</span>
                      <strong className="high">
                        {report.severity}
                      </strong>
                    </div>

                    <div>
                      <span>Location</span>
                      <strong>{report.location}</strong>
                    </div>

                    <div>
                      <span>Department</span>
                      <strong>{report.department}</strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>{report.status}</strong>
                    </div>

                    <div>
                      <span>Reported</span>
                      <strong>{report.date}</strong>
                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </main>
      </div>
    )
  }

  return (
    <div>

      <nav>
        <h2>CivicAI</h2>

        <div>

          <a href="#" onClick={() => setPage("home")}>
            Home
          </a>

          <a href="#">
            How It Works
          </a>

          <a href="#" onClick={() => setPage("reports")}>
            Reports
          </a>

          <button onClick={() => setPage("report")}>
            Report an Issue
          </button>

        </div>
      </nav>

      <main>

        <section>

          <p>AI-POWERED CIVIC REPORTING</p>

          <h1>
            Report problems.
            <br />
            Make your city better.
          </h1>

          <p>
            CivicAI uses artificial intelligence to identify civic issues,
            determine their priority, and route reports to the right department.
          </p>

          <button onClick={() => setPage("report")}>
            Report an Issue →
          </button>

          <button
            style={{
              marginLeft: "12px",
              background: "white",
              color: "#176b5b",
              border: "1px solid #176b5b"
            }}
            onClick={() => setPage("reports")}
          >
            View Reports
          </button>

        </section>

        <section>

          <div>
            <h3>AI Issue Detection</h3>

            <p>
              Upload a photo and let AI analyze the problem.
            </p>
          </div>

          <div>
            <h3>Smart Priority</h3>

            <p>
              Automatically identify the urgency of each issue.
            </p>
          </div>

          <div>
            <h3>Department Routing</h3>

            <p>
              Send the report to the appropriate department.
            </p>
          </div>

        </section>

      </main>

    </div>
  )
}

export default App