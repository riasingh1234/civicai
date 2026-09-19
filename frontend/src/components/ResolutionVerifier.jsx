import { useState } from 'react';
import { api, imageUrl } from '../lib/api';

// Closes the loop: the department's completion photo is compared against the
// citizen's original before the ticket is allowed to close.
export default function ResolutionVerifier({ report, onDone, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState(report.resolution_note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(report.verification || null);

  function pick(e) {
    const chosen = e.target.files[0];
    if (!chosen) return;
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
    setResult(null);
  }

  async function run() {
    if (!file) {
      setError('Attach the completed-work photo first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await api.verifyResolution(report.id, file, note);
      setResult(updated.verification);
      onDone(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Close {report.id}</h3>
          <button className="link-btn" onClick={onClose}>Close</button>
        </div>

        <p className="hint">{report.issue} · {report.address || report.location}</p>

        <div className="before-after">
          <figure>
            {report.image_url && <img src={imageUrl(report.image_url)} alt="" />}
            <figcaption>Citizen's photo</figcaption>
          </figure>
          <figure>
            {preview ? <img src={preview} alt="" /> : <div className="photo-slot">No photo yet</div>}
            <figcaption>Completed work</figcaption>
          </figure>
        </div>

        <div className="form-group">
          <label>Completion photo</label>
          <input type="file" accept="image/*" onChange={pick} />
        </div>

        <div className="form-group">
          <label>Note for the citizen</label>
          <input
            type="text"
            value={note}
            placeholder="e.g. Drain cleared and road patched by ward crew."
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="hint error">{error}</p>}

        {result && (
          <div className={`verify-result ${result.verified ? 'ok' : 'warn'}`}>
            <strong>
              {result.verified
                ? `Repair verified · ${result.confidence}% confidence`
                : 'Not verified — the ticket stays open'}
            </strong>
            <p>{result.observation}</p>
            {result.same_location === false && (
              <p className="hint">The two photos may not show the same location.</p>
            )}
          </div>
        )}

        <button className="primary-btn" onClick={run} disabled={busy}>
          {busy ? 'Comparing the two photos…' : 'Verify and close'}
        </button>
      </div>
    </div>
  );
}
