import { useEffect } from 'react';
import { Map, MapPin } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Incident, LocationState, Severity } from '../types';

const severityColors: Record<Severity, string> = {
  low: '#43c59e',
  medium: '#e7b85c',
  high: '#ef8f5b',
  critical: '#ef6b73',
};

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function MapClickHandler({ onMapLocation }: { onMapLocation?: (latitude: number, longitude: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onMapLocation) return;
    const handleClick = (event: { latlng: { lat: number; lng: number } }) => onMapLocation(event.latlng.lat, event.latlng.lng);
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapLocation]);
  return null;
}

function MapCenterOnLocation({ location }: { location?: LocationState | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.setView([location.latitude, location.longitude], Math.max(map.getZoom(), 9));
  }, [location, map]);
  return null;
}

export function DashboardMap({
  incidents,
  userLocation,
  onMapLocation,
}: {
  incidents: Incident[];
  userLocation?: LocationState | null;
  onMapLocation?: (latitude: number, longitude: number) => void;
}) {
  const mapped = incidents.filter(
    (item) => typeof item.latitude === 'number' && typeof item.longitude === 'number',
  );

  return (
    <div className="map-shell">
      <MapContainer center={userLocation ? [userLocation.latitude, userLocation.longitude] : [20.5937, 78.9629]} zoom={userLocation ? 9 : 5} scrollWheelZoom className="map-view">
        <MapResize />
        <MapClickHandler onMapLocation={onMapLocation} />
        <MapCenterOnLocation location={userLocation} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {mapped.map((incident) => (
          <CircleMarker
            key={incident.id ?? `${incident.name}-${incident.location}`}
            center={[incident.latitude as number, incident.longitude as number]}
            radius={9}
            pathOptions={{
              color: severityColors[incident.severity],
              fillColor: severityColors[incident.severity],
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{incident.name}</strong>
              <br />
              {incident.location}
              <br />
              {incident.severity} priority
            </Popup>
          </CircleMarker>
        ))}
        {userLocation && (
          <CircleMarker center={[userLocation.latitude, userLocation.longitude]} radius={8} pathOptions={{ color: '#ffffff', fillColor: '#4da3ff', fillOpacity: 1, weight: 3 }}>
            <Popup>Your selected location</Popup>
          </CircleMarker>
        )}
      </MapContainer>

      <div className="map-overlay map-label">
        <Map size={14} />
        India operations view
      </div>

      <div className="map-overlay map-legend">
        {(['critical', 'high', 'medium', 'low'] as Severity[]).map((level) => (
          <span key={level}>
            <i style={{ background: severityColors[level] }} />
            {level}
          </span>
        ))}
      </div>

      {!mapped.length && (
        <div className="map-empty">
          <MapPin size={19} />
          <strong>No mapped incidents</strong>
          <span>Use your location or select a point on the map.</span>
        </div>
      )}
    </div>
  );
}
