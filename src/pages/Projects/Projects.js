import React from "react";
import "./Projects.css";
import { Typography, Box } from "@mui/material";

function Projects() {
  return (
    <Box className="projects-container">
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        className="projects-title"
      >
        Projects
      </Typography>
      <Typography variant="body1" className="projects-text">
        Coming soon...
      </Typography>
    </Box>
  );
}

export default Projects;

