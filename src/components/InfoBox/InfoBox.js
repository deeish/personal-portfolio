import React from "react";
import DescriptionIcon from "@mui/icons-material/Description";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import "./InfoBox.css";

export default function BoxSystemProps({ title, items }) {
  const getIcon = (name) => {
    const iconStyle = { fontSize: '1.8rem' }; 
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
    <div className="link-card">
      <div className="link-card-header">
        <h3 className="link-card-title">{title}</h3>
      </div>
      <div className="link-card-content">
        {items.map((item, index) => {
          const isExternal = item.link.startsWith('http') || item.link.endsWith('.pdf');
          
          return (
            <a
              key={index}
              href={item.link}
              target={isExternal ? "_blank" : "_self"}
              rel={isExternal ? "noopener noreferrer" : ""}
              className="link-item"
            >
              <div className="link-icon-wrapper">
                {getIcon(item.content.toLowerCase())}
              </div>
              <span className="link-text">{item.content}</span>
              <ArrowForwardIcon className="link-arrow" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
