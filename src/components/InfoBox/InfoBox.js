import React from "react";
import DescriptionIcon from "@mui/icons-material/Description";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import InstagramIcon from "@mui/icons-material/Instagram";
import XIcon from "@mui/icons-material/X";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import "./InfoBox.css";

export default function InfoBox({ title, items }) {
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
        {items.map((item) => {
          const isExternal = item.link.startsWith('http') || item.link.endsWith('.pdf');
          // Use link as key since it's unique
          const itemKey = `${item.content}-${item.link}`;
          
          return (
            <a
              key={itemKey}
              href={item.link}
              target={isExternal ? "_blank" : "_self"}
              rel={isExternal ? "noopener noreferrer" : ""}
              className="link-item"
              aria-label={`${item.content}${isExternal ? ' (opens in new tab)' : ''}`}
            >
              <div className="link-icon-wrapper" aria-hidden="true">
                {getIcon(item.content.toLowerCase())}
              </div>
              <span className="link-text">{item.content}</span>
              <ArrowForwardIcon className="link-arrow" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
