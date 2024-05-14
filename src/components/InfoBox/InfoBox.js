import React from "react";
import { Box, Typography, Link } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";
import "./InfoBox.css";

export default function BoxSystemProps({ title, items }) {
  const getIcon = (name) => {
    const iconStyle = { fontSize: '2rem' }; 
    switch (name.toLowerCase()) {
      case "github":
        return <GitHubIcon sx={iconStyle} />;
      case "linkedin":
        return <LinkedInIcon sx={iconStyle} />;
      case "instagram":
        return <InstagramIcon sx={iconStyle} />;
      case "x": 
        return <XIcon sx={iconStyle} />;
      case "resume": 
      case "cv": 
        return <DescriptionIcon sx={iconStyle} />;
      default:
        return null; 
    }
  };

  return (
    <Box className="flip-card">
      <Box className="flip-card-inner">
        <Box className="card-face card-front">
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.5rem' }}>
            {title}
          </Typography>
        </Box>
        <Box className="card-face card-back">
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              target="_blank"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {getIcon(item.content.toLowerCase())}
              <Typography variant="body1" sx={{ fontSize: '1.25rem' }}>{item.content}</Typography>
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
