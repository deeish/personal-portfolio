import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';


//try to get the colors working for this,
//ex: wrong information = red, right information = green...
function ContactForm() {
    return (
        <Box
            component="form"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 2,
                maxWidth: 700,
                margin: 'auto'
            }}
            noValidate
            autoComplete="off"
        >
            <Box sx={{ display: 'flex', width: '100%', gap: 3 }}>
                <TextField
                    required
                    id="first-name"
                    label="First Name"
                    variant="outlined"
                    autoComplete="given-name"
                    sx={{ flex: 1 }}
                />
                <TextField
                    required
                    id="last-name"
                    label="Last Name"
                    variant="outlined"
                    autoComplete="family-name"
                    sx={{ flex: 1 }}
                />
            </Box>
            <TextField
                required
                id="email"
                label="Email"
                type="email"
                variant="outlined"
                autoComplete="email"
                fullWidth
            />
            <TextField
                required
                id="message"
                label="Message"
                multiline
                rows={4}
                variant="outlined"
                fullWidth
            />
        </Box>
    );
}

export default ContactForm;
