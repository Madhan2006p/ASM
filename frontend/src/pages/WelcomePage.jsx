import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-page d-flex align-items-center">
      <Container fluid className="px-md-5">
        <Row className="align-items-center justify-content-center h-100 text-center">
          <Col md={8} lg={6}>
            <div className="mx-auto">
              <h1 className="fw-bold display-4 mb-4" style={{ letterSpacing: '-1px' }}>
                Autonomous Security,{" "}
                <br />
                <span style={{ color: "#4169E1" }}>Intelligently Monitored.</span>
              </h1>
              <p className="lead mb-5 mx-auto" style={{ opacity: 0.8, fontSize: '1.2rem', lineHeight: '1.6', maxWidth: '600px' }}>
                Infotech Sentinel uses a fleet of AI agents to perform continuous,
                in-depth penetration tests on your web applications, finding
                vulnerabilities before attackers do.
              </p>

              <Button
                onClick={() => navigate('/dashboard')}
                variant="primary"
                className="px-5 py-3"
                style={{
                  backgroundColor: '#4169E1',
                  borderColor: '#4169E1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                }}
              >
                Go to Dashboard →
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default WelcomePage;
