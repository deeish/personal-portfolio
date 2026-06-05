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
              passionate about creating elegant digital experiences. I graduated with a B.S. in
              Computer Science from Cal State Fullerton and bring real-world experience from two
              software engineering internships — building full-stack features, writing SQL for
              production databases, and shipping React UI components with cross-functional teams.
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

      {/* Education */}
      <section className="about-extra-section" aria-label="Education">
        <h2 className="extra-section-heading">Education</h2>
        <div className="education-card">
          <div className="edu-header">
            <div>
              <h3 className="edu-school">California State University, Fullerton</h3>
              <p className="edu-degree">B.S. in Computer Science</p>
            </div>
            <span className="edu-date">Graduated December 2025</span>
          </div>
          <p className="edu-coursework">
            <strong>Relevant coursework:</strong> Algorithm Engineering, Operating System Concepts,
            Software Engineering, Web Front-End Engineering, File Structure &amp; Database,
            Artificial Intelligence, Computer Communications, Senior Capstone Project
          </p>
        </div>
      </section>

      {/* Experience */}
      <section className="about-extra-section" aria-label="Work Experience">
        <h2 className="extra-section-heading">Experience</h2>
        <div className="experience-list">

          <div className="experience-card">
            <div className="exp-header">
              <div>
                <h3 className="exp-company">Agiline Software</h3>
                <p className="exp-location">Glendora, CA</p>
              </div>
              <span className="exp-date">May 2023 – Sep 2023</span>
            </div>
            <p className="exp-role">Software Engineering Intern</p>
            <ul className="exp-bullets">
              <li>Wrote and refined SQL queries to extract, validate, and present data from a production database for internal reporting and analysis.</li>
              <li>Built SQL-based logic (filters, joins, aggregations) to support data views and improve how information was visualized inside the company's software.</li>
              <li>Contributed React UI components in collaboration with engineers to ship features and improvements.</li>
            </ul>
          </div>

          <div className="experience-card">
            <div className="exp-header">
              <div>
                <h3 className="exp-company">Agiline Software</h3>
                <p className="exp-location">Glendora, CA</p>
              </div>
              <span className="exp-date">Jun 2022 – Aug 2022</span>
            </div>
            <p className="exp-role">Software Engineering Intern</p>
            <ul className="exp-bullets">
              <li>Built responsive UI components using HTML, CSS, JavaScript, and React, improving usability and consistency across pages.</li>
              <li>Collaborated with engineers in an agile workflow (tickets, code reviews) to ship features and bug fixes on schedule.</li>
              <li>Integrated front-end views with back-end endpoints to display dynamic content and handle user input reliably.</li>
            </ul>
          </div>

        </div>
      </section>

      {/* Skills */}
      <section className="about-extra-section" aria-label="Technical Skills">
        <h2 className="extra-section-heading">Skills</h2>
        <div className="skills-grid">
          <div className="skill-group">
            <h3 className="skill-group-label">Languages</h3>
            <div className="skill-badges">
              <span className="skill-badge">Python</span>
              <span className="skill-badge">TypeScript</span>
              <span className="skill-badge">JavaScript</span>
              <span className="skill-badge">SQL</span>
              <span className="skill-badge">Java</span>
              <span className="skill-badge">C/C++</span>
            </div>
          </div>
          <div className="skill-group">
            <h3 className="skill-group-label">Frontend</h3>
            <div className="skill-badges">
              <span className="skill-badge">React</span>
              <span className="skill-badge">React Native</span>
              <span className="skill-badge">HTML</span>
              <span className="skill-badge">CSS</span>
            </div>
          </div>
          <div className="skill-group">
            <h3 className="skill-group-label">Backend</h3>
            <div className="skill-badges">
              <span className="skill-badge">Node.js</span>
              <span className="skill-badge">FastAPI</span>
              <span className="skill-badge">NestJS</span>
              <span className="skill-badge">Express</span>
            </div>
          </div>
          <div className="skill-group">
            <h3 className="skill-group-label">Databases</h3>
            <div className="skill-badges">
              <span className="skill-badge">PostgreSQL</span>
              <span className="skill-badge">SQLite</span>
              <span className="skill-badge">Redis</span>
              <span className="skill-badge">Supabase</span>
            </div>
          </div>
          <div className="skill-group">
            <h3 className="skill-group-label">Tools</h3>
            <div className="skill-badges">
              <span className="skill-badge">Git</span>
              <span className="skill-badge">GitHub Actions</span>
              <span className="skill-badge">Alembic</span>
              <span className="skill-badge">pytest</span>
            </div>
          </div>
          <div className="skill-group">
            <h3 className="skill-group-label">Deployment</h3>
            <div className="skill-badges">
              <span className="skill-badge">Netlify</span>
              <span className="skill-badge">Heroku</span>
              <span className="skill-badge">Vercel</span>
              <span className="skill-badge">Render</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
