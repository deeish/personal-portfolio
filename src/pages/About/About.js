import React from "react";
import "./About.css";

function About() {
  return (
    <div className="about-container">
      {/* Background decorative elements */}
      <div className="about-bg-shapes" aria-hidden="true">
        <div className="about-shape about-shape-1"></div>
        <div className="about-shape about-shape-2"></div>
      </div>

      {/* Header Section */}
      <header className="about-header">
        <h1 className="about-title" id="about-heading">
          <span className="title-line">About</span>
          <span className="title-line title-accent">Me</span>
        </h1>
        <div className="title-underline" aria-hidden="true"></div>
      </header>

      {/* Main Content */}
      <section className="about-content" aria-labelledby="about-heading">
        {/* Image Section */}
        <aside className="about-image-section">
          <figure className="image-wrapper">
            <img 
              src={`${process.env.PUBLIC_URL}/images/Dylan.JPG`} 
              alt="Dylan Salmo, software developer" 
              className="about-image"
              width="400"
              height="533"
            />
            <div className="image-accent" aria-hidden="true"></div>
          </figure>
        </aside>

        {/* Text Content */}
        <article className="about-text-section">
          <div className="intro-section">
            <p className="about-intro">
              I'm <strong className="about-highlight">Dylan Salmo</strong>, a software engineer 
              passionate about creating elegant digital experiences. I specialize in front-end 
              development with technologies like HTML, CSS, JavaScript, and React, and I bring 
              real-world experience from my software engineering internship where I learned to 
              build scalable, user-focused applications.
            </p>
          </div>

          <div className="content-section">
            <h2 className="section-heading">What I Do</h2>
            <p className="about-text">
              I thrive on solving complex problems and turning ideas into reality through code. 
              My work spans from developing efficient database algorithms using SQL to 
              collaborating with cross-functional teams to build robust, maintainable applications. 
              I'm always exploring new technologies and best practices to deliver solutions that 
              are both functional and beautifully designed.
            </p>
          </div>

          <div className="content-section">
            <h2 className="section-heading">Beyond the Screen</h2>
            <p className="about-text">
              When I'm not coding, you'll find me embracing an active lifestyle. Winter means 
              hitting the slopes for skiing, while the rest of the year I'm at the gym, playing 
              sports, or exploring the outdoors. For downtime, I enjoy video games and board games 
              with friends and family. These activities keep me balanced, energized, and bring 
              fresh perspectives to my work.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

export default About;
