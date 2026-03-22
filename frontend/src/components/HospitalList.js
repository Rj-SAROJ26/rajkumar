import React, { useState, useEffect } from "react";
import axios from "axios";

const HospitalList = ({ disease, location, onLocationUpdate }) => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (disease && location) {
      fetchHospitals();
    }
  }, [disease, location]);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/api/hospitals", {
        disease: disease,
        location: location,
      });
      setHospitals(response.data.hospitals || []);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      // Fallback to mock data if API fails
      const mockHospitals = generateMockHospitals(disease, location);
      setHospitals(mockHospitals);
    } finally {
      setLoading(false);
    }
  };

  const generateMockHospitals = (disease, location) => {
    const baseHospitals = [
      {
        id: 1,
        name: "City Dermatology Center",
        address: `123 Medical Plaza, ${location}`,
        distance: "2.3 km",
        rating: 4.5,
        type: "Specialist",
        phone: "+1-555-0123",
        hours: "Mon-Fri 9AM-6PM",
        specialty: getSpecialtyForDisease(disease),
      },
      {
        id: 2,
        name: "General Hospital",
        address: `456 Health Street, ${location}`,
        distance: "3.1 km",
        rating: 4.2,
        type: "Hospital",
        phone: "+1-555-0456",
        hours: "24/7",
        specialty: "General Medicine",
      },
      {
        id: 3,
        name: "Skin Care Clinic",
        address: `789 Wellness Ave, ${location}`,
        distance: "1.8 km",
        rating: 4.7,
        type: "Clinic",
        phone: "+1-555-0789",
        hours: "Tue-Sat 10AM-7PM",
        specialty: getSpecialtyForDisease(disease),
      },
      {
        id: 4,
        name: "Medical Center",
        address: `321 Care Boulevard, ${location}`,
        distance: "4.5 km",
        rating: 4.0,
        type: "Hospital",
        phone: "+1-555-0321",
        hours: "Mon-Sun 8AM-8PM",
        specialty: "Multi-specialty",
      },
    ];

    return baseHospitals;
  };

  const getSpecialtyForDisease = (disease) => {
    const diseaseSpecialties = {
      acne: "Dermatology",
      eczema: "Dermatology",
      psoriasis: "Dermatology",
      ringworm: "Dermatology",
      cellulitis: "Infectious Diseases",
      impetigo: "Dermatology",
      "athlete-foot": "Podiatry",
      "nail-fungus": "Dermatology",
    };

    return diseaseSpecialties[disease.toLowerCase()] || "Dermatology";
  };

  const filteredHospitals = hospitals;

  const openDirections = (hospital) => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospital.address)}`;
    window.open(mapsUrl, "_blank");
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // In a real app, you'd reverse geocode to get city name
          onLocationUpdate(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please enter manually.");
        },
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="hospital-suggestions">
      <div className="hospital-header">
        <h3>Nearby Medical Facilities</h3>
        <p>Find healthcare providers near {location}</p>
      </div>

      <div className="location-controls">
        <button
          type="button"
          className="location-btn"
          onClick={getUserLocation}
        >
          📍 Use My Location
        </button>
        <input
          type="text"
          placeholder="Enter city or pincode"
          value={location}
          onChange={(e) => onLocationUpdate(e.target.value)}
          className="location-input-field"
        />
      </div>

      {loading ? (
        <div className="loading-hospitals">
          <div className="spinner"></div>
          <p>Finding nearby healthcare facilities...</p>
        </div>
      ) : (
        <div className="hospitals-grid">
          {filteredHospitals.map((hospital) => (
            <div key={hospital.id} className="hospital-card">
              <div className="hospital-card-header">
                <h4>{hospital.name}</h4>
                <div className="hospital-rating">⭐ {hospital.rating}</div>
              </div>

              <div className="hospital-details">
                <p className="hospital-address">📍 {hospital.address}</p>
                <p className="hospital-distance">📏 {hospital.distance} away</p>
                <p className="hospital-type">
                  🏥 {hospital.type} • {hospital.specialty}
                </p>
                <p className="hospital-hours">🕒 {hospital.hours}</p>
                <p className="hospital-phone">📞 {hospital.phone}</p>
              </div>

              <div className="hospital-actions">
                <button
                  className="directions-btn"
                  onClick={() => openDirections(hospital)}
                >
                  Get Directions
                </button>
                <button
                  className="call-btn"
                  onClick={() => window.open(`tel:${hospital.phone}`)}
                >
                  Call Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredHospitals.length === 0 && !loading && (
        <div className="no-hospitals">
          <p>No healthcare facilities found matching your criteria.</p>
          <p>Try adjusting your filters or location.</p>
        </div>
      )}
    </div>
  );
};

export default HospitalList;
