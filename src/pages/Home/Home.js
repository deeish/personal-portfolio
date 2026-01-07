import React from "react";
import { Link } from "react-router-dom";
import InfoBox from "../../components/InfoBox/InfoBox";
import "./Home.css";

function Home() {
  return (
    <div className="home-container">
      {/* Animated background shapes */}
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="greeting">Hey, I'm</div>
            <h1 className="hero-name">
              <span className="name-line-1">Dylan</span>
              <span className="name-line-2">Salmo</span>
            </h1>
            <p className="hero-intro">
              A creative software engineer passionate about crafting elegant solutions 
              and bringing ideas to life through code. Currently exploring the intersection 
              of design and development.
            </p>
            <div className="hero-cta">
              <Link to="/projects" className="cta-button cta-primary">
                View My Work
              </Link>
              <Link to="/contact" className="cta-button cta-secondary">
                Get In Touch
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="profile-frame">
              <img 
                src={`${process.env.PUBLIC_URL}/images/Dylan.JPG`} 
                alt="Dylan Salmo" 
                className="profile-image"
              />
              <div className="profile-accent"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="quick-links-section">
        <h2 className="section-title">Quick Links</h2>
        <div className="info-box-container">
          <InfoBox
            title="Documents"
            items={[{ content: "Resume", link: `${process.env.PUBLIC_URL}/Resume.docx.pdf` }]} 
          />
          <InfoBox
            title="Work"
            items={[
              { content: "GitHub", link: "https://github.com/deeish" },
              {
                content: "LinkedIn",
                link: "https://www.linkedin.com/in/dylan-salmo-86a526236/",
              },
            ]}
          />
          <InfoBox
            title="Socials"
            items={[
              { content: "X", link: "https://twitter.com/SalmoDylan" },
              {
                content: "Instagram",
                link: "https://www.instagram.com/deeish_1/",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;
