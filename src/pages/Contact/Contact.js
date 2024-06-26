import React, { useState } from "react";
import { Snackbar, Alert, Box, Button, TextField } from "@mui/material";
import axios from "axios";
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
  const [alertSeverity, setAlertSeverity] = useState("success");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await axios.post('https://dylan-personal-portfolio-38835e64cae1.herokuapp.com/contact', formData);
      setFormData({ firstName: "", lastName: "", email: "", message: "" });
      setSnackbarMessage("Message sent successfully");
      setAlertSeverity("success");
      setOpen(true);
    } catch (error) {
      console.error("Error sending message:", error);
      setSnackbarMessage("Failed to send message");
      setAlertSeverity("error");
      setOpen(true);
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
      <h1>Let's Get in Touch!</h1>
      <p className="contact-intro">
        I'm always open to discussing new projects, creative ideas, or
        opportunities to be part of your visions. Fill out the form below, and
        I'll reply as soon as possible.
      </p>
      <form onSubmit={handleSubmit} className="contact-form">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            width: '100%',
          }}
        >
          <TextField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            sx={{ width: "calc(50% - 8px)" }}
          />
          <TextField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            sx={{ width: "calc(50% - 8px)" }}
          />
        </Box>
        <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
          sx={{ width: '100%' }}
        />
        <TextField
          label="Message"
          name="message"
          multiline
          rows={4}
          value={formData.message}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
          sx={{ width: '100%' }}
        />
        <Button
          type="submit"
          variant="contained"
          sx={{
            mt: 2,
            py: 2,
            fontSize: '1rem',
            width: '15%',
          }}
        >
          Submit
        </Button>
      </form>
      <p>
        If you prefer, you can also reach me via email directly at <a href="mailto:dylansalmo@gmail.com">dylansalmo@gmail.com</a>.
      </p>
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity={alertSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default ContactForm;
