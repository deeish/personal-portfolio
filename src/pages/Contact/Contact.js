import React, { useState, useRef } from "react";
import { Snackbar, Alert } from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';
import emailjs from '@emailjs/browser';
import "./Contact.css";

function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
    website: "", // Honeypot field - hidden from users
  });

  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const formStartTime = useRef(Date.now());
  const lastSubmissionTime = useRef(null);

  // Rate limiting: Check if user can submit (max 3 submissions per hour)
  const canSubmit = () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    if (lastSubmissionTime.current === null) {
      return true; // First submission
    }
    
    // Check localStorage for submission count
    const submissionData = localStorage.getItem('contactFormSubmissions');
    if (submissionData) {
      const { count, timestamp } = JSON.parse(submissionData);
      const timeSinceFirstSubmission = now - timestamp;
      
      // Reset count if more than an hour has passed
      if (timeSinceFirstSubmission > oneHour) {
        localStorage.removeItem('contactFormSubmissions');
        return true;
      }
      
      // Block if 3 or more submissions in the last hour
      if (count >= 3) {
        return false;
      }
    }
    
    return true;
  };

  // Update submission tracking
  const recordSubmission = () => {
    const now = Date.now();
    const submissionData = localStorage.getItem('contactFormSubmissions');
    
    if (submissionData) {
      const { count, timestamp } = JSON.parse(submissionData);
      const oneHour = 60 * 60 * 1000;
      const timeSinceFirstSubmission = now - timestamp;
      
      if (timeSinceFirstSubmission < oneHour) {
        localStorage.setItem('contactFormSubmissions', JSON.stringify({
          count: count + 1,
          timestamp: timestamp
        }));
      } else {
        localStorage.setItem('contactFormSubmissions', JSON.stringify({
          count: 1,
          timestamp: now
        }));
      }
    } else {
      localStorage.setItem('contactFormSubmissions', JSON.stringify({
        count: 1,
        timestamp: now
      }));
    }
    
    lastSubmissionTime.current = now;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Spam protection checks
    // 1. Honeypot check - if this field is filled, it's a bot
    if (formData.website.trim() !== "") {
      // Silently reject spam without logging in production
      if (process.env.NODE_ENV === 'development') {
        console.warn("Spam detected: Honeypot field was filled");
      }
      setSnackbarMessage("Spam detected. If you're a real user, please try again.");
      setSnackbarSeverity("error");
      setOpen(true);
      return;
    }
    
    // 2. Time-based validation - form must be open for at least 3 seconds
    const timeSpentOnForm = (Date.now() - formStartTime.current) / 1000;
    if (timeSpentOnForm < 3) {
      setSnackbarMessage("Please take a moment to fill out the form properly.");
      setSnackbarSeverity("error");
      setOpen(true);
      return;
    }
    
    // 3. Rate limiting check
    if (!canSubmit()) {
      setSnackbarMessage("Too many submissions. Please wait before submitting again.");
      setSnackbarSeverity("error");
      setOpen(true);
      return;
    }
    
    if (!validateForm()) {
      setSnackbarMessage("Please fix the errors in the form.");
      setSnackbarSeverity("error");
      setOpen(true);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // EmailJS configuration - you'll need to set these up
      // Get your service ID, template ID, and public key from emailjs.com
      const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
      const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

      // Development fallback: If EmailJS is not configured, simulate success
      // This allows you to test the form UI while waiting for EmailJS verification
      if (!serviceId || !templateId || !publicKey) {
        if (process.env.NODE_ENV === 'development') {
          // Only log in development
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw new Error('EmailJS configuration is missing. Please set up environment variables.');
        }
      } else {
        // Send email using EmailJS
        await emailjs.send(
          serviceId,
          templateId,
          {
            from_name: `${formData.firstName} ${formData.lastName}`,
            from_email: formData.email,
            message: formData.message,
            to_name: 'Dylan Salmo',
          },
          publicKey
        );
      }

      // Record successful submission for rate limiting
      recordSubmission();
      
      // Success
      setFormData({ firstName: "", lastName: "", email: "", message: "", website: "" });
      setSnackbarMessage("Thanks for reaching out! I'll get back to you soon.");
      setSnackbarSeverity("success");
      setOpen(true);
      
      // Reset form start time for next submission
      formStartTime.current = Date.now();
    } catch (error) {
      // Log error in development, but don't expose details to users
      if (process.env.NODE_ENV === 'development') {
        console.error("EmailJS error:", error);
      }
      setSnackbarMessage(
        "Sorry, there was an error sending your message. Please try again or email me directly at dylansalmo@gmail.com"
      );
      setSnackbarSeverity("error");
      setOpen(true);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="contact-bg-shapes" aria-hidden="true">
        <div className="contact-shape contact-shape-1"></div>
        <div className="contact-shape contact-shape-2"></div>
      </div>

      {/* Header Section */}
      <header className="contact-header">
        <h1 className="contact-title" id="contact-heading">
          <span className="contact-title-line">Let's</span>
          <span className="contact-title-line contact-title-accent">Connect</span>
        </h1>
        <div className="contact-title-underline" aria-hidden="true"></div>
        <p className="contact-intro">
          Have a project in mind or just want to chat? I'm always open to discussing 
          new opportunities, creative ideas, or collaborations. Drop me a message below 
          or reach out directly via email.
        </p>
      </header>

      {/* Main Content */}
      <div className="contact-content">
        {/* Contact Info Card */}
        <aside className="contact-info-card" aria-labelledby="contact-info-heading">
          <div className="info-icon-wrapper" aria-hidden="true">
            <EmailIcon className="info-icon" />
          </div>
          <h3 id="contact-info-heading" className="info-title">Direct Email</h3>
          <p className="info-text">
            Prefer to reach out directly? Send me an email and I'll get back to you as soon as possible.
          </p>
          <a href="mailto:dylansalmo@gmail.com" className="email-link" aria-label="Send email to dylansalmo@gmail.com">
            dylansalmo@gmail.com
          </a>
        </aside>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="contact-form" aria-labelledby="contact-heading" noValidate>
          <fieldset className="form-row">
            <legend className="sr-only">Name Information</legend>
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                First Name <span className="required-indicator" aria-label="required">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`form-input ${errors.firstName ? 'form-input-error' : ''}`}
                placeholder="John"
                aria-required="true"
                aria-invalid={errors.firstName ? "true" : "false"}
                aria-describedby={errors.firstName ? "firstName-error firstName-help" : "firstName-help"}
                autoComplete="given-name"
              />
              <span id="firstName-help" className="sr-only">Enter your first name</span>
              {errors.firstName && (
                <span id="firstName-error" className="form-error" role="alert" aria-live="polite">
                  {errors.firstName}
                </span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                Last Name <span className="required-indicator" aria-label="required">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`form-input ${errors.lastName ? 'form-input-error' : ''}`}
                placeholder="Doe"
                aria-required="true"
                aria-invalid={errors.lastName ? "true" : "false"}
                aria-describedby={errors.lastName ? "lastName-error lastName-help" : "lastName-help"}
                autoComplete="family-name"
              />
              <span id="lastName-help" className="sr-only">Enter your last name</span>
              {errors.lastName && (
                <span id="lastName-error" className="form-error" role="alert" aria-live="polite">
                  {errors.lastName}
                </span>
              )}
            </div>
          </fieldset>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email <span className="required-indicator" aria-label="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              placeholder="john.doe@example.com"
              aria-required="true"
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error email-help" : "email-help"}
              autoComplete="email"
            />
            <span id="email-help" className="sr-only">Enter your email address</span>
            {errors.email && (
              <span id="email-error" className="form-error" role="alert" aria-live="polite">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="message" className="form-label">
              Message <span className="required-indicator" aria-label="required">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              className={`form-textarea ${errors.message ? 'form-input-error' : ''}`}
              placeholder="Tell me about your project or just say hello..."
              aria-required="true"
              aria-invalid={errors.message ? "true" : "false"}
              aria-describedby={errors.message ? "message-error message-help" : "message-help"}
            />
            <span id="message-help" className="sr-only">Enter your message (minimum 10 characters)</span>
            {errors.message && (
              <span id="message-error" className="form-error" role="alert" aria-live="polite">
                {errors.message}
              </span>
            )}
          </div>

          {/* Honeypot field - hidden from users, but bots will fill it */}
          <div className="honeypot-field" aria-hidden="true">
            <label htmlFor="website">Website (leave blank)</label>
            <input
              type="text"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              tabIndex="-1"
              autoComplete="off"
            />
          </div>

          <button 
            type="submit" 
            className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
            disabled={isSubmitting}
            aria-label={isSubmitting ? 'Sending message, please wait' : 'Submit contact form'}
            aria-busy={isSubmitting}
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
          severity={snackbarSeverity}
          sx={{ 
            width: '100%',
            backgroundColor: snackbarSeverity === 'error' ? '#d32f2f' : '#053742',
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
