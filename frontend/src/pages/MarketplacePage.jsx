<<<<<<< HEAD
import React, { useState } from 'react';
import { Card, Button, Form, Row, Col, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiShoppingCart, FiSearch } from 'react-icons/fi';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [installedItems, setInstalledItems] = useState([]);

  const tools = [
    {
      id: 1,
      name: "Shodan API Connector",
      category: "APIs",
      description: "Instantly pull port, service, and vulnerability intelligence directly from Shodan for discovered IP addresses.",
      price: "Free",
      rating: "4.8",
      icon: "🔌"
    },
    {
      id: 2,
      name: "WHOIS Domain Monitor",
      category: "Intelligence",
      description: "Automated WHOIS records retrieval and monitoring to notify you before domain registration expiry.",
      price: "$19/mo",
      rating: "4.5",
      icon: "🔍"
    },
    {
      id: 3,
      name: "Subdomain Brute-forcer (Pro)",
      category: "Scanners",
      description: "A high-performance active scanning tool leveraging wordlists to discover hidden subdomains that passive scraping misses.",
      price: "$49/mo",
      rating: "4.9",
      icon: "🚀"
    },
    {
      id: 4,
      name: "Censys Data Sync",
      category: "APIs",
      description: "Synchronize deep host certificates and service details from Censys to enhance your attack surface visualization.",
      price: "Free Trial",
      rating: "4.6",
      icon: "⚡"
    },
    {
      id: 5,
      name: "Slack Alert Dispatcher",
      category: "Integrations",
      description: "Receive instant real-time Slack notifications the second a new critical vulnerability or open port is detected.",
      price: "Free",
      rating: "4.7",
      icon: "💬"
    },
    {
      id: 6,
      name: "Nuclei Template Runner",
      category: "Scanners",
      description: "Schedule customized YAML template scanning targeting exposed directories and misconfigurations on your subdomains.",
      price: "$29/mo",
      rating: "4.9",
      icon: "🛡️"
    }
  ];

  const handleInstall = (toolName) => {
    if (installedItems.includes(toolName)) {
      setInstalledItems(installedItems.filter(item => item !== toolName));
      alert(`${toolName} has been uninstalled.`);
    } else {
      setInstalledItems([...installedItems, toolName]);
      alert(`${toolName} has been successfully installed and integrated!`);
    }
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content" style={{ padding: '2rem', marginLeft: '280px', minHeight: 'calc(100vh - 70px)' }}>
        
        {/* Header */}
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0" style={{ color: 'var(--text-color)', fontWeight: '600' }}>Marketplace</h2>
          </div>
          <div>
            <Badge bg="primary" style={{ padding: '10px 15px', borderRadius: '20px', fontSize: '0.9rem' }}>
              <FiShoppingCart className="me-2" /> Installed: {installedItems.length}
            </Badge>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div className="d-flex gap-2">
            {['All', 'APIs', 'Intelligence', 'Scanners', 'Integrations'].map(cat => (
              <Button 
                key={cat}
                variant={selectedCategory === cat ? 'primary' : 'outline-secondary'}
                onClick={() => setSelectedCategory(cat)}
                style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: '500' }}
              >
                {cat}
              </Button>
            ))}
          </div>
          <div style={{ position: 'relative', width: '300px' }}>
            <Form.Control 
              type="text" 
              placeholder="Search extensions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ borderRadius: '20px', paddingLeft: '35px' }}
            />
            <FiSearch style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          </div>
        </div>

        {/* Extensions Grid */}
        <Row className="g-4">
          {filteredTools.map(tool => {
            const isInstalled = installedItems.includes(tool.name);
            return (
              <Col md={6} lg={4} key={tool.id}>
                <Card style={{ 
                  borderRadius: '16px', 
                  border: '1px solid var(--header-border)', 
                  background: 'var(--bg-color)',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  height: '100%'
                }} className="h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span style={{ fontSize: '2rem' }}>{tool.icon}</span>
                      <Badge bg="secondary" style={{ borderRadius: '12px', fontSize: '0.75rem' }}>{tool.category}</Badge>
                    </div>
                    <Card.Title style={{ color: 'var(--text-color)', fontWeight: '600' }}>{tool.name}</Card.Title>
                    <Card.Text style={{ color: '#64748b', fontSize: '0.9rem', flexGrow: 1 }}>
                      {tool.description}
                    </Card.Text>
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top" style={{ borderColor: 'var(--header-border)' }}>
                      <div>
                        <span className="fw-bold" style={{ color: 'var(--text-color)', fontSize: '1.1rem' }}>{tool.price}</span>
                        <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>⭐ {tool.rating}</span>
                      </div>
                      <Button 
                        variant={isInstalled ? "outline-danger" : "primary"}
                        onClick={() => handleInstall(tool.name)}
                        style={{ borderRadius: '12px', padding: '6px 16px', fontWeight: '500' }}
                      >
                        {isInstalled ? "Uninstall" : "Install"}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>

      </div>
    </div>
  );
};

export default MarketplacePage;
=======
import React, { useState } from 'react';
import { Card, Button, Form, Row, Col, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiArrowLeft, FiShoppingCart, FiSearch } from 'react-icons/fi';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [installedItems, setInstalledItems] = useState([]);

  const tools = [
    {
      id: 1,
      name: "Shodan API Connector",
      category: "APIs",
      description: "Instantly pull port, service, and vulnerability intelligence directly from Shodan for discovered IP addresses.",
      price: "Free",
      rating: "4.8",
      icon: "🔌"
    },
    {
      id: 2,
      name: "WHOIS Domain Monitor",
      category: "Intelligence",
      description: "Automated WHOIS records retrieval and monitoring to notify you before domain registration expiry.",
      price: "$19/mo",
      rating: "4.5",
      icon: "🔍"
    },
    {
      id: 3,
      name: "Subdomain Brute-forcer (Pro)",
      category: "Scanners",
      description: "A high-performance active scanning tool leveraging wordlists to discover hidden subdomains that passive scraping misses.",
      price: "$49/mo",
      rating: "4.9",
      icon: "🚀"
    },
    {
      id: 4,
      name: "Censys Data Sync",
      category: "APIs",
      description: "Synchronize deep host certificates and service details from Censys to enhance your attack surface visualization.",
      price: "Free Trial",
      rating: "4.6",
      icon: "⚡"
    },
    {
      id: 5,
      name: "Slack Alert Dispatcher",
      category: "Integrations",
      description: "Receive instant real-time Slack notifications the second a new critical vulnerability or open port is detected.",
      price: "Free",
      rating: "4.7",
      icon: "💬"
    },
    {
      id: 6,
      name: "Nuclei Template Runner",
      category: "Scanners",
      description: "Schedule customized YAML template scanning targeting exposed directories and misconfigurations on your subdomains.",
      price: "$29/mo",
      rating: "4.9",
      icon: "🛡️"
    }
  ];

  const handleInstall = (toolName) => {
    if (installedItems.includes(toolName)) {
      setInstalledItems(installedItems.filter(item => item !== toolName));
      alert(`${toolName} has been uninstalled.`);
    } else {
      setInstalledItems([...installedItems, toolName]);
      alert(`${toolName} has been successfully installed and integrated!`);
    }
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="digital-page">
      <Sidebar />
      <div className="digital-page-content" style={{ padding: '2rem', marginLeft: '280px', minHeight: 'calc(100vh - 70px)' }}>
        
        {/* Header */}
        <div className="digital-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)} className="rounded-circle px-2">
              <FiArrowLeft size={16} />
            </Button>
            <h2 className="mb-0" style={{ color: 'var(--text-color)', fontWeight: '600' }}>Marketplace</h2>
          </div>
          <div>
            <Badge bg="primary" style={{ padding: '10px 15px', borderRadius: '20px', fontSize: '0.9rem' }}>
              <FiShoppingCart className="me-2" /> Installed: {installedItems.length}
            </Badge>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div className="d-flex gap-2">
            {['All', 'APIs', 'Intelligence', 'Scanners', 'Integrations'].map(cat => (
              <Button 
                key={cat}
                variant={selectedCategory === cat ? 'primary' : 'outline-secondary'}
                onClick={() => setSelectedCategory(cat)}
                style={{ borderRadius: '20px', padding: '6px 16px', fontWeight: '500' }}
              >
                {cat}
              </Button>
            ))}
          </div>
          <div style={{ position: 'relative', width: '300px' }}>
            <Form.Control 
              type="text" 
              placeholder="Search extensions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ borderRadius: '20px', paddingLeft: '35px' }}
            />
            <FiSearch style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
          </div>
        </div>

        {/* Extensions Grid */}
        <Row className="g-4">
          {filteredTools.map(tool => {
            const isInstalled = installedItems.includes(tool.name);
            return (
              <Col md={6} lg={4} key={tool.id}>
                <Card style={{ 
                  borderRadius: '16px', 
                  border: '1px solid var(--header-border)', 
                  background: 'var(--bg-color)',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  height: '100%'
                }} className="h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span style={{ fontSize: '2rem' }}>{tool.icon}</span>
                      <Badge bg="secondary" style={{ borderRadius: '12px', fontSize: '0.75rem' }}>{tool.category}</Badge>
                    </div>
                    <Card.Title style={{ color: 'var(--text-color)', fontWeight: '600' }}>{tool.name}</Card.Title>
                    <Card.Text style={{ color: '#64748b', fontSize: '0.9rem', flexGrow: 1 }}>
                      {tool.description}
                    </Card.Text>
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top" style={{ borderColor: 'var(--header-border)' }}>
                      <div>
                        <span className="fw-bold" style={{ color: 'var(--text-color)', fontSize: '1.1rem' }}>{tool.price}</span>
                        <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>⭐ {tool.rating}</span>
                      </div>
                      <Button 
                        variant={isInstalled ? "outline-danger" : "primary"}
                        onClick={() => handleInstall(tool.name)}
                        style={{ borderRadius: '12px', padding: '6px 16px', fontWeight: '500' }}
                      >
                        {isInstalled ? "Uninstall" : "Install"}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>

      </div>
    </div>
  );
};

export default MarketplacePage;
>>>>>>> latest
