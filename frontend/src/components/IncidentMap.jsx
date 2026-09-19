import { useMemo, useState } from 'react';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41],
});

const CATEGORIES = [
  'All',
  'Road Infrastructure',
  'Waste Management',
  'Drainage',
  'Street Lighting',
  'Water Supply',
  'Public Safety',
  'Traffic',
];

const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];

const DELHI = [28.6139, 77.209];

function heatColour(score) {
  if (score >= 85) return '#b91c1c';
  if (score >= 70) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  return '#10b981';
}

export default function IncidentMap({ incidents, hotspots = [] }) {
  const [heatmap, setHeatmap] = useState(false);
  const [category, setCategory] = useState('All');
  const [severity, setSeverity] = useState('All');

  const shown = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.lat != null &&
          (category === 'All' || i.category === category) &&
          (severity === 'All' || i.severity === severity)
      ),
    [incidents, category, severity]
  );

  const centre = shown.length ? [shown[0].lat, shown[0].lng] : DELHI;

  return (
    <div className="map-block">
      <div className="map-controls">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>
          ))}
        </select>

        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All severities' : s}</option>
          ))}
        </select>

        <label className="map-toggle">
          <input type="checkbox" checked={heatmap} onChange={(e) => setHeatmap(e.target.checked)} />
          Density view
        </label>

        <span className="map-count">{shown.length} shown</span>
      </div>

      <div className="map-frame">
        <MapContainer center={centre} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />

          {heatmap
            ? shown.map((i) => {
                const colour = heatColour(i.priority?.score ?? 40);
                // Radius tracks how many citizens reported it, not just severity.
                const spread = 300 + (i.support_count || 1) * 220;
                return (
                  <Circle
                    key={`heat-${i.id}`}
                    center={[i.lat, i.lng]}
                    radius={spread}
                    pathOptions={{ color: 'transparent', fillColor: colour, fillOpacity: 0.32 }}
                  >
                    <Popup>
                      <strong>{i.issue}</strong>
                      <br />
                      Priority {i.priority?.score} · {i.support_count} report(s)
                    </Popup>
                  </Circle>
                );
              })
            : shown.map((i) => (
                <Marker key={i.id} position={[i.lat, i.lng]}>
                  <Popup>
                    <strong>{i.id}</strong>
                    <br />
                    {i.issue}
                    <br />
                    {i.severity} · priority {i.priority?.score}
                    {i.support_count > 1 && <><br />{i.support_count} citizens reported this</>}
                  </Popup>
                </Marker>
              ))}
        </MapContainer>
      </div>

      {hotspots.length > 0 && (
        <div className="hotspot-list">
          <h4>Where to send crews first</h4>
          {hotspots.map((h) => (
            <div key={`${h.lat}-${h.lng}`} className="hotspot-row">
              <span className="hotspot-area">{h.area}</span>
              <span className="hotspot-bar">
                <span style={{ width: `${Math.min(h.reports * 18, 100)}%` }} />
              </span>
              <span className="hotspot-count">
                {h.reports} reports · {h.open} open · mostly {h.top_category.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
