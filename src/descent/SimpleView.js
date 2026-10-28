import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HERO, LINKS, PROJECTS, ROUTE_TARGETS } from './content';
import { AboutBody, ContactBody, EducationBody, ExperienceBody, ExternalLink, ProjectBody, SkillsBody } from './sections';
import './SimpleView.css';

function Section({ id, title, children }) {
  return (
    <section id={id} className="simple__section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="simple__heading">{title}</h2>
      {children}
    </section>
  );
}

// The whole portfolio on one plain page: no 3D, no motion. Shown on request, on phones,
// to visitors who prefer reduced motion, and wherever WebGL isn't available.
export default function SimpleView({ canRun, onRun, section }) {
  const location = useLocation();

  // Open on the section the visitor came from (or an old page URL), otherwise at the top.
  useEffect(() => {
    const target = section && section !== 'summit' ? section : ROUTE_TARGETS[location.pathname];
    const el = target && document.getElementById(target);
    if (el) el.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [section, location.pathname]);

  return (
    <div className="simple">
      <header className="simple__bar">
        <a href="#summit" className="simple__brand">
          <img
            src={`${process.env.PUBLIC_URL}/images/DS_logo_kit/DS_icon_white_transparent_64.png`}
            alt=""
            width="28"
            height="28"
          />
          <span>Dylan Salmo</span>
        </a>
        <nav className="simple__links" aria-label="Site">
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
          <a href={LINKS.resume} target="_blank" rel="noopener noreferrer">Résumé</a>
          {canRun && <button type="button" onClick={onRun}>Take the run</button>}
        </nav>
      </header>

      <main className="simple__main">
        <section id="summit" className="simple__hero" aria-labelledby="simple-name">
          <p className="simple__kicker">Software Engineer</p>
          <h1 id="simple-name" className="simple__name">Dylan Salmo</h1>
          <p className="simple__intro">{HERO.intro}</p>
          <div className="simple__actions">
            <ExternalLink className="btn btn--signal" href={LINKS.resume}>Résumé</ExternalLink>
            <ExternalLink className="btn" href={LINKS.github}>GitHub</ExternalLink>
            <ExternalLink className="btn" href={LINKS.linkedin}>LinkedIn</ExternalLink>
          </div>
          {canRun && (
            <p className="simple__run">
              This site is usually a ski run down a 3D mountain.{' '}
              <button type="button" onClick={onRun}>Take the run</button>
            </p>
          )}
        </section>

        <Section id="education" title="Education"><EducationBody /></Section>
        <Section id="experience" title="Experience"><ExperienceBody /></Section>

        <section id="projects" className="simple__section" aria-labelledby="projects-title">
          <h2 id="projects-title" className="simple__heading">Projects</h2>
          {PROJECTS.map((project) => (
            <article key={project.id} id={project.id} className="simple__project" aria-labelledby={`${project.id}-name`}>
              <h3 id={`${project.id}-name`} className="simple__project-name">{project.name}</h3>
              <ProjectBody project={project} />
            </article>
          ))}
        </section>

        <Section id="skills" title="Skills"><SkillsBody /></Section>
        <Section id="about" title="About"><AboutBody /></Section>
        <Section id="contact" title="Let's connect"><ContactBody /></Section>
      </main>
    </div>
  );
}
