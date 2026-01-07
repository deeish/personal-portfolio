import React, { useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';
import "./Contact.css";

function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission (backend is disabled)
    setTimeout(() => {
      setFormData({ firstName: "", lastName: "", email: "", message: "" });
      setSnackbarMessage("Thanks for reaching out! I'll get back to you soon.");
      setOpen(true);
      setIsSubmitting(false);
    }, 1000);
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  };

  return (
    <div className="contact-container">
      {/* Background decorative elements */}
      <div className="contact-bg-shapes">
        <div className="contact-shape contact-shape-1"></div>
        <div className="contact-shape contact-shape-2"></div>
      </div>

      {/* Header Section */}
      <div className="contact-header">
        <h1 className="contact-title">
          <span className="contact-title-line">Let's</span>
          <span className="contact-title-line contact-title-accent">Connect</span>
        </h1>
        <div className="contact-title-underline"></div>
        <p className="contact-intro">
          Have a project in mind or just want to chat? I'm always open to discussing 
          new opportunities, creative ideas, or collaborations. Drop me a message below 
          or reach out directly via email.
        </p>
      </div>

      {/* Main Content */}
      <div className="contact-content">
        {/* Contact Info Card */}
        <div className="contact-info-card">
          <div className="info-icon-wrapper">
            <EmailIcon className="info-icon" />
          </div>
          <h3 className="info-title">Direct Email</h3>
          <p className="info-text">
            Prefer to reach out directly? Send me an email and I'll get back to you as soon as possible.
          </p>
          <a href="mailto:dylansalmo@gmail.com" className="email-link">
            dylansalmo@gmail.com
          </a>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="John"
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="john.doe@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message" className="form-label">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              className="form-textarea"
              placeholder="Tell me about your project or just say hello..."
            />
          </div>

          <button 
            type="submit" 
            className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      <Snackbar 
        open={open} 
        autoHideDuration={6000} 
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity="success"
          sx={{ 
            width: '100%',
            backgroundColor: '#053742',
            color: '#ffffff',
            '& .MuiAlert-icon': {
              color: '#ffffff'
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default ContactForm;
