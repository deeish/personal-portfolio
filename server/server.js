const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://dreamy-puffpuff-0f09a0.netlify.app', 'https://dylansalmo.com']
}));
app.use(bodyParser.json());

// Ensure the directory exists
const logDirectory = path.join(__dirname, 'contact_submission');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// Path to the log file
const logFilePath = path.join(logDirectory, 'contact_form_submissions.log');

// Basic route for testing the server
app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

// POST route for the contact form
app.post('/contact', (req, res) => {
    const { firstName, lastName, email, message } = req.body;
    console.log(`Received message from ${firstName} ${lastName}: ${email} - ${message}`);
    const logEntry = `Time: ${new Date().toISOString()}, FirstName: ${firstName}, LastName: ${lastName}, Email: ${email}, Message: ${message}\n`;
    fs.appendFileSync(logFilePath, logEntry);
    res.json({ status: 'success', message: "Message received successfully!" });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
