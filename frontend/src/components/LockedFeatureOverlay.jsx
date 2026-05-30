import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLock } from "react-icons/fi";

// Feature ID to label mapping
const FEATURE_LABELS = {
  "1": "Subdomains",
  "2": "Endpoints",
  "3": "Open Ports",
  "4": "Directories",
  "5": "Technologies",
  "6": "Vulnerabilities",
  "7": "SSL Certificates",
  "8": "Email Security",
  "9": "Scan History",
};

const LockedFeatureOverlay = ({ featureId, children }) => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const features = user.features || [];
        // Empty features array = all unlocked
        setHasAccess(features.length === 0 || features.includes(featureId));
      } catch {
        setHasAccess(true);
      }
    };
    checkAccess();
    window.addEventListener("userLogin", checkAccess);
    window.addEventListener("userLogout", checkAccess);
    window.addEventListener("storage", (e) => {
      if (e.key === "user") checkAccess();
    });
    return () => {
      window.removeEventListener("userLogin", checkAccess);
      window.removeEventListener("userLogout", checkAccess);
    };
  }, [featureId]);

  if (hasAccess) return children;

  const featureName = FEATURE_LABELS[featureId] || "This feature";

  return (
    <div style={{ position: "relative", minHeight: "60vh" }}>
      {/* Blurred content behind the overlay */}
      <div style={{ filter: "blur(10px)", pointerEvents: "none", userSelect: "none", opacity: 0.7 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          background: "rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(2px)",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "48px 40px 40px",
            maxWidth: "420px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f43f5e, #e11d48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <FiLock size={32} color="#fff" />
          </div>

          <h4
            style={{
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "#1e293b",
              marginBottom: 8,
            }}
          >
            {featureName} is Locked
          </h4>

          <p
            style={{
              color: "#64748b",
              fontSize: "0.9rem",
              lineHeight: 1.5,
              marginBottom: 6,
            }}
          >
            Contact <strong>hackersinfotech</strong> to unlock this feature
            and gain full access to your attack surface data.
          </p>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <a
              href="https://www.hackersinfotech.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                transition: "transform 0.15s",
              }}
              onMouseOver={(e) => (e.target.style.transform = "translateY(-1px)")}
              onMouseOut={(e) => (e.target.style.transform = "none")}
            >
              <i className="bi bi-globe2"></i> Visit hackersinfotech.com
            </a>

            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSewsGyCmlZkT7i-uJpclxMltrsQMwoKiW2jgRRJKk2SS72rrQ/viewform"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 24px",
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                color: "#475569",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.color = "#3b82f6";
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.color = "#475569";
              }}
            >
              <i className="bi bi-chat-dots"></i> Let's Connect
            </a>

            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: 12,
                color: "#94a3b8",
                fontWeight: 500,
                fontSize: "0.85rem",
                border: "none",
                background: "none",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseOver={(e) => (e.target.style.color = "#3b82f6")}
              onMouseOut={(e) => (e.target.style.color = "#94a3b8")}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockedFeatureOverlay;
