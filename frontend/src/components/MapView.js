import React, { useEffect, useRef } from "react";

const MapView = ({ hospitals, userLocation }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // For demo purposes, we'll embed a Google Maps iframe
    // In a production app, you'd use Google Maps JavaScript API or Leaflet
    if (mapRef.current && !mapInstanceRef.current) {
      const location = userLocation || "New York, NY"; // Default location
      const mapUrl = `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOJQ3pYPF5h5Qw&q=hospitals+near+${encodeURIComponent(location)}`;

      const iframe = document.createElement("iframe");
      iframe.src = mapUrl;
      iframe.width = "100%";
      iframe.height = "400";
      iframe.style.border = "0";
      iframe.allowFullscreen = true;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";

      mapRef.current.appendChild(iframe);
      mapInstanceRef.current = iframe;
    }
  }, [userLocation]);

  const openFullMap = () => {
    const location = userLocation || "New York, NY";
    const mapsUrl = `https://www.google.com/maps/search/hospitals+near+${encodeURIComponent(location)}`;
    window.open(mapsUrl, "_blank");
  };

  return (
    <div className="map-view">
      <div className="map-header">
        <h4>Hospital Locations</h4>
        <button className="full-map-btn" onClick={openFullMap}>
          View Full Map
        </button>
      </div>

      <div className="map-container" ref={mapRef}>
        <div className="map-placeholder">
          <div className="map-icon">🗺️</div>
          <p>Loading map...</p>
          <small>Interactive map showing nearby healthcare facilities</small>
        </div>
      </div>

      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-color hospital-marker"></span>
          <span>Hospitals</span>
        </div>
        <div className="legend-item">
          <span className="legend-color clinic-marker"></span>
          <span>Clinics</span>
        </div>
        <div className="legend-item">
          <span className="legend-color user-marker"></span>
          <span>Your Location</span>
        </div>
      </div>
    </div>
  );
};

export default MapView;
