import React from "react";
import "./About.css";
import { Typography, Box, Grid, Avatar } from "@mui/material";

function About() {
  return (
    <Box className="about-container" sx={{ flexGrow: 1, padding: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4} className="about-avatar">
          <Avatar
            alt="Dylan Salmo"
            src={`${process.env.PUBLIC_URL}/images/DylanPic.jpeg`}
            sx={{ width: 270, height: 370, margin: "auto" }}
            className="avatar-img"
          />
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            className="about-title"
          >
            About Me
          </Typography>
          <Typography variant="body1" paragraph className="about-text">
            Hey there! I'm <strong className="about-highlight">Dylan Salmo</strong>, a software
            engineer who loves all things creative. I'm into front-end tech like
            HTML, CSS, JavaScript, and React, and I've got some experience from
            a software engineering internship.
          </Typography>
          <Typography variant="body1" paragraph>
            I've worked on some exciting projects, tackling complex problems and
            creating efficient solutions. My experience includes developing
            algorithms for large databases using SQL and collaborating with
            teams to build robust applications.
          </Typography>
          <Typography variant="body1" paragraph>
            When I'm not coding, I love getting outside and staying active.
            During the winter months, you'll find me skiing and
            enjoying the snow. The rest of the year, I'm all about hitting the
            gym, playing sports, or going on outdoor adventures. For downtime, I
            like video games and board games—perfect for relaxing and having
            some fun with friends and family. These hobbies keep me energized
            and always ready to bring my best to my work.
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default About;
