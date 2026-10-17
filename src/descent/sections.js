import React from 'react';
import ContactForm from './ContactForm';
import { ABOUT, EDUCATION, EXPERIENCE, LINKS, SKILLS } from './content';
import './sections.css';

// Section contents shared by the 3D run and the simple view.

export function Chips({ items }) {
  return (
    <ul className="chips">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function ExternalLink({ href, children, className = 'text-link' }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children} <span aria-hidden="true">↗</span>
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

export function EducationBody() {
  return (
    <>
      <div className="entry">
        <div>
          <h3 className="entry__title">{EDUCATION.school}</h3>
          <p className="entry__meta">{EDUCATION.degree}</p>
        </div>
        <span className="entry__date">{EDUCATION.date}</span>
      </div>
      <h4 className="card__subhead">Relevant coursework</h4>
      <Chips items={EDUCATION.coursework} />
    </>
  );
}

export function ExperienceBody() {
  return EXPERIENCE.map((job) => (
    <div key={job.date} className="card__group">
      <div className="entry">
        <div>
          <h3 className="entry__title">{job.role}</h3>
          <p className="entry__meta">{job.company} · {job.location}</p>
        </div>
        <span className="entry__date">{job.date}</span>
      </div>
      <ul className="bullets">
        {job.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
      </ul>
    </div>
  ));
}

export function ProjectBody({ project }) {
  return (
    <>
      <p className="card__tagline">{project.tagline}</p>
      {project.video && (
        <div className="media media--video">
          <iframe
            src={project.video}
            title={`${project.name} demo video`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <p className="card__body">{project.description}</p>
      <Chips items={project.tech} />
      <details className="features">
        <summary>Key features</summary>
        <ul>
          {project.features.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
      </details>
      <div className="card__links">
        {project.links.map((link) => <ExternalLink key={link.href} href={link.href}>{link.label}</ExternalLink>)}
      </div>
    </>
  );
}

export function SkillsBody() {
  return (
    <div className="skills">
      {SKILLS.map((group) => (
        <div key={group.label}>
          <h3 className="card__subhead">{group.label}</h3>
          <Chips items={group.items} />
        </div>
      ))}
    </div>
  );
}

export function AboutBody() {
  return (
    <div className="about">
      <img className="about__photo" src={ABOUT.photo} alt="Dylan Salmo" loading="lazy" width="600" height="800" />
      <div>
        <p className="card__body">{ABOUT.intro}</p>
        {ABOUT.sections.map((section) => (
          <div key={section.heading} className="card__group">
            <h3 className="card__subhead">{section.heading}</h3>
            <p className="card__body">{section.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactBody({ footnote }) {
  return (
    <>
      <div className="lodge">
        <div className="lodge__intro">
          <p className="card__body">
            Have a project in mind or just want to chat? I'm always open to discussing new opportunities,
            creative ideas, or collaborations. Drop me a message or reach out directly via email.
          </p>
          <a className="lodge__email" href={`mailto:${LINKS.email}`}>{LINKS.email}</a>
          <div className="card__links">
            <ExternalLink href={LINKS.github}>GitHub</ExternalLink>
            <ExternalLink href={LINKS.linkedin}>LinkedIn</ExternalLink>
            <ExternalLink href={LINKS.x}>X</ExternalLink>
            <ExternalLink href={LINKS.instagram}>Instagram</ExternalLink>
          </div>
        </div>
        <ContactForm />
      </div>
      <p className="lodge__footer">
        © {new Date().getFullYear()} Dylan Salmo · Built with React and three.js
        {footnote && <span className="lodge__footnote">{footnote}</span>}
      </p>
    </>
  );
}
