import React, { useState } from "react";
import { Button, Form, Container, Row, Col, Card, Image, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../utils/api";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    // Real-time typing restrictions
    if (name === 'email' && type !== 'checkbox') {
      // Prevent spaces in email
      newValue = value.replace(/\s/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  try {
    setIsLoading(true);
    await login(formData.email, formData.password);
    navigate('/');
  } catch (err) {
    setError(err?.detail || err?.message || err?.error || 'Login failed. Please check your credentials and ensure the server is running.');
  } finally {
    setIsLoading(false);
  }
};
  return (
    <div className="login-page d-flex align-items-center justify-content-center" style={{ position: 'relative', zIndex: 1 }}>
      <Container>
        <Row className="justify-content-center align-items-center">
          {/* Left: Login Form */}
          <Col md={6} lg={5}>
            <Card 
              className="border-0" 
              style={{
                background: 'var(--header-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '24px',
                boxShadow: '0 8px 32px rgba(65, 105, 225, 0.15)',
                border: '1px solid rgba(65, 105, 225, 0.4)',
                color: 'var(--text-color)'
              }}
            >
              <Card.Body className="p-3 p-sm-4">
                <div className="text-center">                 
             <h4 className="fw-normal mb-4" style={{ color: 'var(--text-color)' }}>LOGIN</h4>
                </div>

                <div className="mb-4">
                  <div className="d-flex gap-3">
                    <Button 
                      variant="outline-secondary" 
                      className="d-flex align-items-center justify-content-center flex-fill"
                      style={{
                        borderRadius: '12px',
                        borderColor: 'var(--input-border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        fontWeight: 500,
                        padding: '10px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <FcGoogle size={22} className="me-2" />
                      Google
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      className="d-flex align-items-center justify-content-center flex-fill"
                      style={{
                        borderRadius: '12px',
                        borderColor: 'var(--input-border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        fontWeight: 500,
                        padding: '10px'
                      }}
                    >
                      <FaFacebook size={22} color="#1877F2" className="me-2" />
                      Facebook
                    </Button>
                  </div>
                </div>

                {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium" style={{ color: 'var(--text-color)' }}>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="example@domain.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      title="Please enter a valid email address"
                      disabled={isLoading}
                      className="welcome-input"
                      style={{
                        borderRadius: '12px',
                        padding: '10px 16px'
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium" style={{ color: 'var(--text-color)' }}>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="********"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      title="Password must be at least 8 characters long"
                      disabled={isLoading}
                      className="welcome-input"
                      style={{
                        borderRadius: '12px',
                        padding: '10px 16px'
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4 d-flex justify-content-between align-items-center">
                    <Form.Check
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      label="Remember me"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                    <Link to="/forgot-password" className="text-decoration-none text-primary">
                      Forgot Password?
                    </Link>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 py-2 mb-3 text-white"
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
                      border: 'none',
                      borderRadius: '25px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      height: '45px'
                    }}
                  >
                    {isLoading ? 'LOGGING IN...' : 'LOGIN'}
                  </Button>

                  <div className="text-center mt-3">
                    <p className="mb-0" style={{ color: 'var(--text-color)' }}>
                      Don't have account yet?{' '}
                      <Link to="/signup" className="text-decoration-none text-primary fw-medium">
                        New Account
                      </Link>
                    </p>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Right: Image */}
          <Col md={6} lg={5} className="d-none d-md-block text-center">
            <Image 
              src="/assets/login.png" 
              alt="Login Visual" 
              fluid 
              rounded 
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;