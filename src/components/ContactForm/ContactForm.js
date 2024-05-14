import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

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
                margin: 'auto',
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
                    sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                                borderColor: 'blue', 
                            },
                        },
                    }}
                />
                <TextField
                    required
                    id="last-name"
                    label="Last Name"
                    variant="outlined"
                    autoComplete="family-name"
                    sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                                borderColor: 'blue', 
                            },
                        },
                    }}
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
                sx={{
                    '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                            borderColor: 'blue', 
                        },
                    },
                }}
            />
            <TextField
                required
                id="message"
                label="Message"
                multiline
                rows={4}
                variant="outlined"
                fullWidth
                sx={{
                    '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                            borderColor: 'blue', 
                        },
                    },
                }}
            />
        </Box>
    );
}

export default ContactForm;
