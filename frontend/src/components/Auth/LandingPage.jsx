import React from 'react';
import { Shield, ArrowRight, Sun, Moon } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onNavigate, theme, setTheme }) => {
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="landing-logo">
          <Shield className="landing-logo-icon" size={28} />
          <span className="landing-logo-text">Infotech Sentinel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={toggleTheme} 
            style={{ 
              background: 'transparent', 
              border: '1.5px solid #3B82F6', 
              borderRadius: '8px',
              padding: '0.4rem',
              cursor: 'pointer', 
              color: 'var(--text-primary)', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </nav>

      <main className="landing-main">
        <div className="landing-hero">
          <div className="landing-badge">Advanced Security Posture Management</div>
          <h1 className="landing-title">
            Discover, Monitor, and Protect Your Digital Attack Surface
          </h1>
          <p className="landing-subtitle">
            Continuous asset discovery and vulnerability management.
            Take control of your external attack surface with automated scanning and real-time alerts.
          </p>
          <div className="landing-cta-group">
            <button className="landing-btn-primary" onClick={() => onNavigate('login')}>
              Log In to Portal <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
