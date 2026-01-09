import React from "react";
import "./Projects.css";

function Projects() {
  // Extract video ID from YouTube URL
  const youtubeUrl = "https://www.youtube.com/watch?v=Q6KYsBBshZ4&t=2s";
  const videoId = youtubeUrl.split("v=")[1]?.split("&")[0];

  return (
    <div className="projects-container">
      {/* Background decorative elements */}
      <div className="projects-bg-shapes">
        <div className="projects-shape projects-shape-1"></div>
        <div className="projects-shape projects-shape-2"></div>
      </div>

      {/* Header Section */}
      <div className="projects-header">
        <h1 className="projects-title">
          <span className="projects-title-line">My</span>
          <span className="projects-title-line projects-title-accent">Projects</span>
        </h1>
        <div className="projects-title-underline"></div>
      </div>

      {/* Featured Project - MyCabinet */}
      <div className="featured-project">
        <div className="project-card featured-card">
          <div className="project-header">
            <h2 className="project-name">MyCabinet</h2>
            <span className="project-badge">Featured</span>
          </div>
          <p className="project-tagline">Cocktail Enthusiast Mobile Application</p>
          <p className="project-description">
            A full-stack mobile application for cocktail enthusiasts featuring an extensive 
            cocktail database with detailed recipes, personalized recommendations based on your 
            ingredient cabinet, and an AI assistant for cocktail help. Users can track ingredients, 
            save favorite recipes, manage shopping lists, and discover new drinks tailored to what 
            they have available. Built as a capstone project showcasing full-stack development skills.
          </p>
          
          <div className="project-content">
            <div className="project-media">
              <div className="video-wrapper">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="MyCabinet App Demo"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
            
            <div className="project-details">
              <div className="project-features">
                <h3 className="details-heading">Key Features</h3>
                <ul className="features-list">
                  <li>Extensive cocktail database with recipes (TheCocktailDB API)</li>
                  <li>Personal ingredient cabinet tracking and management</li>
                  <li>Personalized cocktail recommendations based on available ingredients</li>
                  <li>AI assistant chat for cocktail help and suggestions</li>
                  <li>Save favorites and manage shopping lists</li>
                  <li>User authentication and profile management</li>
                </ul>
              </div>
              
              <div className="project-tech">
                <h3 className="details-heading">Technologies</h3>
                <div className="tech-badges">
                  <span className="tech-badge">TypeScript</span>
                  <span className="tech-badge">React Native</span>
                  <span className="tech-badge">FastAPI</span>
                  <span className="tech-badge">Python</span>
                  <span className="tech-badge">PostgreSQL</span>
                </div>
              </div>
              
              <div className="project-links">
                <a 
                  href="https://github.com/deeish/capstone-project-mycabinet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="project-link"
                >
                  <svg className="link-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  View on GitHub
                </a>
                <a 
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-link"
                >
                  <svg className="link-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Watch Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Projects Grid */}
      <div className="projects-grid">
        <div className="project-card">
          <div className="project-header">
            <h2 className="project-name">Checkm8</h2>
          </div>
          <p className="project-tagline">Chess Game with AI Engine</p>
          <p className="project-description">
            A complete chess implementation in Python featuring a custom AI opponent using Minimax 
            search with Alpha-Beta Pruning. Includes both graphical (Tkinter) and console interfaces, 
            complete chess rules (castling, en passant, promotion), and comprehensive post-game analysis 
            with Stockfish integration for move evaluation and performance metrics.
          </p>
          
          <div className="project-screenshots">
            <div className="screenshots-gallery">
              <div className="screenshot-item">
                <img 
                  src={`${process.env.PUBLIC_URL}/images/Chess1.png`} 
                  alt="Checkm8 Chess App Screenshot 1" 
                  className="screenshot-image"
                />
              </div>
              <div className="screenshot-item">
                <img 
                  src={`${process.env.PUBLIC_URL}/images/Chess2.png`} 
                  alt="Checkm8 Chess App Screenshot 2" 
                  className="screenshot-image"
                />
              </div>
            </div>
          </div>
          
          <div className="project-details-compact">
            <div className="project-features-compact">
              <h3 className="details-heading">Key Features</h3>
              <ul className="features-list">
                <li>Complete chess rules implementation (castling, en passant, promotion)</li>
                <li>AI opponent with Minimax algorithm and Alpha-Beta Pruning</li>
                <li>Graphical interface (Tkinter) and console mode</li>
                <li>Post-game analysis with Stockfish integration</li>
                <li>Position evaluation heuristics (material, mobility, king safety)</li>
                <li>Performance testing suite and game statistics tracking</li>
              </ul>
            </div>
            
            <div className="project-tech">
              <h3 className="details-heading">Technologies</h3>
              <div className="tech-badges">
                <span className="tech-badge">Python</span>
                <span className="tech-badge">Tkinter</span>
                <span className="tech-badge">Stockfish</span>
              </div>
            </div>
            
            <div className="project-links">
              <a 
                href="https://github.com/deeish/Checkm8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="project-link"
              >
                <svg className="link-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Projects;

