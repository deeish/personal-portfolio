import React, { useRef, useState } from 'react';
import emailjs from '@emailjs/browser';

// `hpExtra` is the honeypot: hidden from people, filled in by bots. Its name is deliberately
// one that browsers and password managers won't recognise and autofill.
const EMPTY_FORM = { firstName: '', lastName: '', email: '', message: '', hpExtra: '' };
const STORAGE_KEY = 'contactFormSubmissions';
const ONE_HOUR = 60 * 60 * 1000;
const MAX_PER_HOUR = 3;

// Submissions in the last hour, or null. Storage can be blocked (private browsing)
// or hold junk; both count as "no history" rather than breaking the form.
function readSubmissions() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && Number.isFinite(saved.count) && Number.isFinite(saved.timestamp) && Date.now() - saved.timestamp < ONE_HOUR) {
      return saved;
    }
  } catch (error) {
    // Fall through to "no history".
  }
  return null;
}

function writeSubmissions(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Without storage the limit only lasts for this page view.
  }
}

function ContactForm() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null); // { tone: 'success' | 'error', message }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const formStartTime = useRef(Date.now());

  // Rate limiting: at most three messages an hour, remembered across reloads.
  const canSubmit = () => {
    const saved = readSubmissions();
    return !saved || saved.count < MAX_PER_HOUR;
  };

  const recordSubmission = () => {
    const saved = readSubmissions();
    writeSubmissions(saved ? { count: saved.count + 1, timestamp: saved.timestamp } : { count: 1, timestamp: Date.now() });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // 1. Honeypot check - if this field is filled, it's a bot
    if (formData.hpExtra.trim() !== '') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Spam detected: Honeypot field was filled');
      }
      setStatus({ tone: 'error', message: "Spam detected. If you're a real user, please try again." });
      return;
    }

    // 2. Time-based validation - form must be open for at least 3 seconds
    const timeSpentOnForm = (Date.now() - formStartTime.current) / 1000;
    if (timeSpentOnForm < 3) {
      setStatus({ tone: 'error', message: 'Please take a moment to fill out the form properly.' });
      return;
    }

    // 3. Rate limiting check
    if (!canSubmit()) {
      setStatus({ tone: 'error', message: 'Too many submissions. Please wait before submitting again.' });
      return;
    }

    if (!validateForm()) {
      setStatus({ tone: 'error', message: 'Please fix the errors in the form.' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setStatus(null);

    try {
      const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
      const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

      // Development fallback: If EmailJS is not configured, simulate success
      if (!serviceId || !templateId || !publicKey) {
        if (process.env.NODE_ENV === 'development') {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          throw new Error('EmailJS configuration is missing. Please set up environment variables.');
        }
      } else {
        await emailjs.send(
          serviceId,
          templateId,
          {
            from_name: `${formData.firstName} ${formData.lastName}`.trim(),
            from_email: formData.email,
            message: formData.message,
            to_name: 'Dylan Salmo',
          },
          publicKey
        );
      }

      recordSubmission();
      setFormData(EMPTY_FORM);
      setStatus({ tone: 'success', message: "Thanks for reaching out! I'll get back to you soon." });
      formStartTime.current = Date.now();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('EmailJS error:', error);
      }
      setStatus({
        tone: 'error',
        message: 'Sorry, there was an error sending your message. Please try again or email me directly at dylansalmo@gmail.com',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (name, label, props = {}) => {
    const Input = props.multiline ? 'textarea' : 'input';
    const { multiline, optional, ...inputProps } = props;
    return (
      <div className="field">
        <label htmlFor={name} className="field__label">
          {label} {optional ? <span className="field__optional">(optional)</span> : <span aria-hidden="true">*</span>}
        </label>
        <Input
          id={name}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          className={`field__input${errors[name] ? ' field__input--error' : ''}`}
          aria-required={optional ? 'false' : 'true'}
          aria-invalid={errors[name] ? 'true' : 'false'}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          {...inputProps}
        />
        {errors[name] && (
          <span id={`${name}-error`} className="field__error" role="alert">
            {errors[name]}
          </span>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form" aria-label="Contact form" noValidate>
      <div className="contact-form__row">
        {field('firstName', 'First name', { type: 'text', placeholder: 'John', autoComplete: 'given-name' })}
        {field('lastName', 'Last name', { type: 'text', placeholder: 'Doe', autoComplete: 'family-name', optional: true })}
      </div>
      {field('email', 'Email', { type: 'email', placeholder: 'john.doe@example.com', autoComplete: 'email' })}
      {field('message', 'Message', { multiline: true, rows: 5, placeholder: 'Tell me about your project or just say hello...' })}

      {/* Honeypot field - hidden from users, but bots will fill it */}
      <div className="honeypot-field" aria-hidden="true">
        <label htmlFor="hpExtra">Leave this field empty</label>
        <input
          type="text"
          id="hpExtra"
          name="hpExtra"
          value={formData.hpExtra}
          onChange={handleChange}
          tabIndex="-1"
          autoComplete="off"
        />
      </div>

      <div className="contact-form__footer">
        <button type="submit" className="btn btn--signal" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send message'}
        </button>
        <p className={`contact-form__status${status ? ` is-${status.tone}` : ''}`} role="status" aria-live="polite">
          {status ? status.message : ''}
        </p>
      </div>
    </form>
  );
}

export default ContactForm;
