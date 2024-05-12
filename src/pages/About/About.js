import React from 'react';
import { Typography, Box, Grid } from '@mui/material';

function About() {
  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="h3" component="h1" gutterBottom>
            About Me
          </Typography>
          <Typography variant="body1" paragraph>
            Hello! I'm <strong>Your Name</strong>, a passionate and dedicated <em>your profession</em> with a love for all things creative. I specialize in <em>your specialty</em>, and have <em>years of experience or education background</em> in the field.
          </Typography>
          <Typography variant="body1" paragraph>
            My journey started in <em>your starting point</em>, and over the years, I've developed a deep understanding of <em>key areas of your profession</em>. My approach to work is centered around creating meaningful, user-centric solutions that resonate with the audience and deliver tangible results.
          </Typography>
          <Typography variant="body1" paragraph>
            When I'm not working, I enjoy <em>your hobbies or interests</em>. These activities help me stay inspired and energized, ready to tackle challenging projects.
          </Typography>
          <Typography variant="body1">
            I'm excited to explore opportunities to collaborate on projects that are innovative and impactful. Let's connect!
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default About;
