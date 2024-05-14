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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:3001/contact",
        formData
      );
      setFormData({ firstName: "", lastName: "", email: "", message: "" }); // Clear form
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
            gap: 2, // Assuming 2 is translated to '16px' based on typical MUI theme spacing values
            width: '100%', // Ensure the Box uses full width to avoid unexpected wrapping
          }}
        >
          <TextField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            sx={{ width: "calc(50% - 8px)" }}  // Adjusts for gap correctly, assuming 16px total gap, 8px per side
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
          sx={{ width: '100%' }} // Full width for alignment
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
    mt: 2, // Margin top
    py: 2, // Padding top and bottom (using shorthand for padding Y-axis)
    fontSize: '1rem', // Font size
    width: '15%', // You could also use a specific width like '100%' or '250px'
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
