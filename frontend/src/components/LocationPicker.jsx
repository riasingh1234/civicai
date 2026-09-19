import { useState } from 'react';
import { api } from '../lib/api';

// Two ways in: type a landmark and we geocode it, or let the browser hand us
// coordinates and we reverse geocode those. Either way the parent ends up with
// { lat, lng, address }.
export default function LocationPicker({ value, onChange, resolved, onResolved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function lookup() {
    if (!value.trim()) return;
    setBusy(true);
    setError('');
    try {
      onResolved(await api.geocode(value));
    } catch (e) {
      setError(e.message);
      onResolved(null);
    } finally {
      setBusy(false);
    }
  }

  function detect() {
    if (!navigator.geolocation) {
      setError('This browser does not expose location access.');
      return;
    }
    setBusy(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const place = await api.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          onResolved(place);
          onChange(place.address || '');
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      },
      () => {
        setError('Location permission denied. Type the nearest landmark instead.');
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="form-group">
      <label>Location</label>
      <div className="location-row">
        <input
          type="text"
          value={value}
          placeholder="e.g. Near Sector 14 Metro Station, Faridabad"
          onChange={(e) => {
            onChange(e.target.value);
            onResolved(null);
          }}
          onBlur={lookup}
        />
        <button type="button" className="secondary-btn" onClick={detect} disabled={busy}>
          Use my location
        </button>
      </div>

      {busy && <p className="hint">Resolving location…</p>}
      {error && <p className="hint error">{error}</p>}

      {resolved && (
        <p className="hint resolved">
          Pinned to {resolved.address}
          <span className="coords">
            {resolved.lat.toFixed(5)}, {resolved.lng.toFixed(5)}
          </span>
        </p>
      )}
    </div>
  );
}
