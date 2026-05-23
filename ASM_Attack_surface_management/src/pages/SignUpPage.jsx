import React, { useState } from "react";
import { Button, Form, Container, Row, Col, Card, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { Image } from "react-bootstrap";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from "react-icons/fi";
import { register } from "../utils/api";

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Real-time typing restrictions
    if (name === 'phone') {
      // Strip non-digits and limit to 10 chars
      newValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'name') {
      // Only allow letters and spaces, max 50 chars
      newValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 50);
    } else if (name === 'email') {
      // Prevent spaces in email
      newValue = value.replace(/\s/g, '');
    } else if (name === 'organization') {
      // Limit to 100 chars
      newValue = value.slice(0, 100);
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    try {
      setIsLoading(true);

      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        organization: formData.organization,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      // Show success message
      alert('Registration successful! Welcome to Infotech Sentinel.');

      // Redirect to home page after successful registration
      navigate('/');

    } catch (err) {
      console.error('Unexpected error:', err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page d-flex align-items-center justify-content-center" style={{ position: 'relative', zIndex: 1 }}>
      <Container>
        <Row className="justify-content-center align-items-center">
          <Col md={8} lg={6} xl={5}>
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
                <div className="text-center mb-3">
                  <h3 className="mb-2" style={{ color: 'var(--text-color)', fontWeight: '600' }}>Create Account</h3>
                  <p style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '0.9rem' }}>Join our community today</p>
                </div>

                {error && <Alert variant="danger" className="text-center mb-4">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3 position-relative">
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                      >
                        <FiUser style={{ color: 'var(--text-color)', opacity: 0.7 }} />
                      </span>
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        minLength={2}
                        maxLength={50}
                        pattern="^[A-Za-z\s]{2,50}$"
                        title="Name should only contain letters and spaces (2-50 characters)"
                        className="border-start-0 ps-2 welcome-input"
                        style={{
                          height: '42px',
                          borderLeft: 'none',
                          boxShadow: 'none'
                        }}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3 position-relative">
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                      >
                        <FiMail style={{ color: 'var(--text-color)', opacity: 0.7 }} />
                      </span>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                        title="Please enter a valid email address"
                        className="border-start-0 ps-2 welcome-input"
                        style={{
                          height: '42px',
                          borderLeft: 'none',
                          boxShadow: 'none'
                        }}
                      />
                    </div>
                  </Form.Group>

                  {/* Phone number field */}
                  <Form.Group className="mb-3 position-relative">
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                      >
                        <FiPhone style={{ color: 'var(--text-color)', opacity: 0.7 }} />
                      </span>
                      <Form.Control
                        type="tel"
                        name="phone"
                        placeholder="Phone Number (10 digits)"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        pattern="[0-9]{10}"
                        title="Please enter a valid 10-digit phone number"
                        className="border-start-0 ps-2 welcome-input"
                        style={{
                          height: '42px',
                          borderLeft: 'none',
                          boxShadow: 'none'
                        }}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3 position-relative">
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                      >
                        <FiUser style={{ color: 'var(--text-color)', opacity: 0.7 }} />
                      </span>
                      <Form.Control
                        type="text"
                        name="organization"
                        placeholder="Organization"
                        value={formData.organization}
                        onChange={handleChange}
                        required
                        minLength={2}
                        maxLength={100}
                        title="Organization name must be at least 2 characters long"
                        className="border-start-0 ps-2 welcome-input"
                        style={{
                          height: '42px',
                          borderLeft: 'none',
                          boxShadow: 'none'
                        }}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3 position-relative">
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                      >
                        <FiLock style={{ color: 'var(--text-color)', opacity: 0.7 }} />
                      </span>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password (min 8 chars)"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                        title="Must contain at least one number, one uppercase and one lowercase letter, and at least 8 characters"
                        className="border-start-0 ps-2 welcome-input"
                        style={{
                          height: '42px',
                          borderLeft: 'none',
                          boxShadow: 'none'
                        }}
                      />
                      <button
                        type="button"
                        className="btn bg-transparent position-absolute"
                        style={{
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: '10',
                          color: 'var(--text-color)',
                          opacity: 0.7,
                          boxShadow: 'none',
                          outline: 'none',
                          border: 'none'
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FiEye /> : <FiEyeOff />}
                      </button>
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-4 position-relative">
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0"
                        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                      >
                        <FiLock style={{ color: 'var(--text-color)', opacity: 0.7 }} />
                      </span>
                      <Form.Control
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        minLength={8}
                        title="Please confirm your password"
                        className="border-start-0 ps-2 welcome-input"
                        style={{
                          height: '42px',
                          borderLeft: 'none',
                          boxShadow: 'none'
                        }}
                      />
                      <button
                        type="button"
                        className="btn bg-transparent position-absolute"
                        style={{
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: '10',
                          color: 'var(--text-color)',
                          opacity: 0.7,
                          boxShadow: 'none',
                          outline: 'none',
                          border: 'none'
                        }}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FiEye /> : <FiEyeOff />}
                      </button>
                    </div>
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 py-2 mb-3 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
                      border: 'none',
                      borderRadius: '25px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      height: '45px'
                    }}
                  >
                    SIGN UP
                  </Button>

                  <div className="text-center mt-3">
                    <p style={{ color: 'var(--text-color)' }} className="mb-0">
                      Already have an account?{' '}
                      <Link
                        to="/login"
                        style={{
                          color: '#4b6cb7',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
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

export default SignUpPage;
