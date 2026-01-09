import React from "react";
import { Link } from "react-router-dom";
import InfoBox from "../../components/InfoBox/InfoBox";
import "./Home.css";

function Home() {
  return (
    <div className="home-container">
      {/* Animated background shapes */}
      <div className="bg-shapes" aria-hidden="true">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-content">
          <div className="hero-text">
            <p className="greeting" aria-label="Greeting">Hey, I'm</p>
            <h1 id="hero-heading" className="hero-name">
              <span className="name-line-1">Dylan</span>
              <span className="name-line-2">Salmo</span>
            </h1>
            <p className="hero-intro">
              A creative software engineer passionate about crafting elegant solutions 
              and bringing ideas to life through code. Currently exploring the intersection 
              of design and development.
            </p>
            <nav className="hero-cta" aria-label="Primary navigation actions">
              <Link to="/projects" className="cta-button cta-primary" aria-label="View my projects">
                View My Work
              </Link>
              <Link to="/contact" className="cta-button cta-secondary" aria-label="Get in touch with me">
                Get In Touch
              </Link>
            </nav>
          </div>
          <div className="hero-visual">
            <figure className="profile-frame">
              <img 
                src={`${process.env.PUBLIC_URL}/images/Dylan.JPG`} 
                alt="Dylan Salmo, software developer" 
                className="profile-image"
                width="400"
                height="533"
                loading="eager"
              />
              <div className="profile-accent" aria-hidden="true"></div>
            </figure>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="quick-links-section" aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className="section-title">Quick Links</h2>
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
      </section>
    </div>
  );
}

export default Home;
