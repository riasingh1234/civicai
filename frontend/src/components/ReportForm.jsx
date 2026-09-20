import { useState } from 'react';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import DuplicateNotice from './DuplicateNotice';
import LocationPicker from './LocationPicker';
import PriorityBadge from './PriorityMeter';

// Citizens land here from the home page. Flow is: evidence -> AI reads it ->
// we show what we found plus anything that looks like a repeat -> they confirm.
export default function ReportForm({ lang, onSubmitted }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState('');
  const [place, setPlace] = useState(null);
  const [notes, setNotes] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [mergeInto, setMergeInto] = useState(null);
  const [showHindi, setShowHindi] = useState(lang === 'hi');

  function pickFile(e) {
    const chosen = e.target.files[0];
    if (!chosen) return;
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
    setResult(null);
    setMergeInto(null);
  }

  async function analyze() {
    if (!file && !notes.trim()) {
      setError('Add a photo, or describe the problem in the box below.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = file
        ? await api.analyzeImage(file, { location, description: notes, coords: place })
        : await api.analyzeText({ text: notes, location, lat: place?.lat, lng: place?.lng });

      setResult(data);
      if (data.location_resolved) setPlace(data.location_resolved);
      // Pre-select the strongest match so the common case is one click.
      setMergeInto(data.duplicates?.[0]?.report_id ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const saved = await api.createReport({
        ...result,
        location,
        description: notes,
        language: lang,
        location_resolved: place,
        merge_into: mergeInto,
      });
      onSubmitted(saved, mergeInto);
      setFile(null);
      setPreview(null);
      setLocation('');
      setPlace(null);
      setNotes('');
      setResult(null);
      setMergeInto(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-container">
      <h2>{t(lang, 'reportIssue')}</h2>

      <div className="form-group">
        <label>{t(lang, 'photoLabel')}</label>
        <input type="file" accept="image/*" capture="environment" onChange={pickFile} />
        <p className="hint">{t(lang, 'photoHint')}</p>
        {preview && <img className="evidence-preview" src={preview} alt="" />}
      </div>

      <LocationPicker
        value={location}
        onChange={setLocation}
        resolved={place}
        onResolved={setPlace}
      />

      <div className="form-group">
        <label>{t(lang, 'notesLabel')}</label>
        <textarea
          rows={3}
          value={notes}
          placeholder={lang === 'hi'
            ? 'जैसे: यहाँ तीन दिन से गटर ओवरफ़्लो हो रहा है।'
            : 'e.g. The drain has been overflowing here for three days.'}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="hint">{t(lang, 'notesHint')}</p>
      </div>

      {error && <p className="hint error">{error}</p>}

      {!result ? (
        <button className="primary-btn" onClick={analyze} disabled={busy}>
          {busy ? t(lang, 'analyzing') : t(lang, 'analyze')}
        </button>
      ) : (
        <div className="analysis-card">
          <div className="analysis-grid">
            <div><span>{t(lang, 'detected')}</span><strong>{result.issue}</strong></div>
            <div><span>{t(lang, 'category')}</span><strong>{result.category}</strong></div>
            <div>
              <span>{t(lang, 'severity')}</span>
              <strong className={`severity-${result.severity?.toLowerCase()}`}>{result.severity}</strong>
            </div>
            <div><span>Confidence</span><strong>{result.confidence}</strong></div>
          </div>

          <div className="routing-box">
            <h4>{t(lang, 'department')}: {result.department}</h4>
            <p>
              <em>{t(lang, 'whyDept')}:</em> {result.routing_reason}
            </p>
          </div>

          <PriorityBadge priority={result.priority} />

          <DuplicateNotice
            matches={result.duplicates}
            selected={mergeInto}
            onSelect={setMergeInto}
          />

          <div className="complaint-box">
            <div className="complaint-head">
              <h4>{t(lang, 'complaintDraft')}</h4>
              {result.complaint_hi && (
                <button className="link-btn" onClick={() => setShowHindi(!showHindi)}>
                  {showHindi ? 'Show English' : 'हिन्दी में देखें'}
                </button>
              )}
            </div>
            <p>{showHindi && result.complaint_hi ? result.complaint_hi : result.complaint}</p>
          </div>

          <button className="success-btn" onClick={submit} disabled={busy}>
            {mergeInto ? `${t(lang, 'merge')} (${mergeInto})` : t(lang, 'submit')}
          </button>
        </div>
      )}
    </div>
  );
}
