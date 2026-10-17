import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Hud from './Hud';
import ScrambleText from './ScrambleText';
import MountainScene, { SceneCancelled } from './scene/MountainScene';
import { CAMERA_END, displayAltitude, heightAt, pathX } from './scene/world';
import { CHECKPOINTS, HERO, LINKS, PROJECTS, ROUTE_TARGETS } from './content';
import { AboutBody, ContactBody, EducationBody, ExperienceBody, ExternalLink, ProjectBody, SkillsBody } from './sections';
import './Descent.css';

// How far past a project's card its ice block sits, so you ski up to it while reading.
const ICE_BLOCK_LEAD = 34;
const SUMMIT_ALTITUDE = 8848;

const prefersReducedMotion = () => Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      el.classList.add('is-visible');
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Leg({ id, side, index, kicker, title, mark, wide, children }) {
  const ref = useReveal();
  const altitude = mark ? `${mark.alt.toLocaleString('en-US')} M` : '—';
  return (
    <section id={id} className={`leg leg--${side}`} aria-labelledby={`${id}-title`}>
      <article ref={ref} className={`card${wide ? ' card--wide' : ''}`}>
        <p className="card__kicker">
          <span className="card__index">{String(index).padStart(2, '0')}</span>
          <span>{kicker}</span>
          <span className="card__alt">ALT {altitude}</span>
        </p>
        <ScrambleText as="h2" id={`${id}-title`} className="card__title" text={title} />
        {children}
      </article>
    </section>
  );
}

export default function Descent({ onSimple, onUnsupported }) {
  const canvasRef = useRef(null);
  const nameRef = useRef(null);
  const sceneRef = useRef(null);
  const hudRef = useRef(null);
  const maxScrollRef = useRef(1);
  const routedRef = useRef(false);
  const loadRef = useRef(0);
  const loaderAltRef = useRef(null);
  const loaderBarRef = useRef(null);
  const eventRef = useRef(() => {});
  const unsupportedRef = useRef(onUnsupported);
  unsupportedRef.current = onUnsupported;
  const nightRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [marks, setMarks] = useState({});
  const [activeId, setActiveId] = useState('summit');
  const [nameReady, setNameReady] = useState(false);
  const [night, setNight] = useState(false);
  const [flash, setFlash] = useState(0);
  const location = useLocation();

  // Scene events: the snow name is ready, the sun was clicked, or the yeti caught you.
  eventRef.current = (name) => {
    if (name === 'name-ready') setNameReady(true);
    if (name === 'toggle-night') setNight(!nightRef.current);
    if (name === 'yeti-catch') setFlash(Date.now());
  };

  const syncScroll = useCallback((immediate = false) => {
    if (sceneRef.current) sceneRef.current.setTarget(window.scrollY / maxScrollRef.current, { immediate });
  }, []);

  // Where each section sits on the page decides where it sits on the mountain.
  const measure = useCallback(() => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    maxScrollRef.current = maxScroll;
    const next = {};
    CHECKPOINTS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = id === 'summit' ? 0 : rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2;
      const p = Math.min(1, Math.max(0, center / maxScroll));
      const z = p * CAMERA_END;
      next[id] = { p, z, alt: Math.round(displayAltitude(heightAt(pathX(z), z))) };
    });
    setMarks(next);
    if (sceneRef.current) {
      sceneRef.current.setCheckpoints(PROJECTS.map((project) => next[project.id] && {
        z: next[project.id].z + ICE_BLOCK_LEAD,
        side: project.side === 'right' ? 1 : -1,
      }));
    }
  }, []);

  const jumpTo = useCallback((id) => {
    if (sceneRef.current) sceneRef.current.autopilot();
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (id === 'summit') {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior, block: 'center' });
  }, []);

  // Build the mountain after the loader has painted; it reports progress as it goes.
  useEffect(() => {
    let cancelled = false;
    let scene = null;
    const timer = setTimeout(async () => {
      try {
        scene = new MountainScene(canvasRef.current, {
          mobile: window.innerWidth < 760 || Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
          reducedMotion: prefersReducedMotion(),
          iceIcons: PROJECTS.map((project) => project.icon),
          nameElement: nameRef.current,
          onProgress: (fraction) => { loadRef.current = fraction; },
          onEvent: (name, detail) => eventRef.current(name, detail),
          onTelemetry: (telemetry) => hudRef.current && hudRef.current.update(telemetry),
        });
        await scene.build();
        if (cancelled) return;
        scene.start();
        scene.setNight(nightRef.current);
        sceneRef.current = scene;
        measure();
        syncScroll(true);
        loadRef.current = 1;
        setStatus('ready');
      } catch (error) {
        if (cancelled || error instanceof SceneCancelled) return;
        if (process.env.NODE_ENV === 'development') console.warn('3D run unavailable, switching to the simple view', error);
        if (scene) scene.dispose();
        unsupportedRef.current();
      }
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scene) scene.dispose();
      sceneRef.current = null;
    };
  }, [measure, syncScroll]);

  // The loader is an altimeter: it climbs to the summit as the mountain builds.
  useEffect(() => {
    if (status !== 'loading') return undefined;
    const altitude = loaderAltRef.current;
    const bar = loaderBarRef.current;
    let raf = 0;
    let shown = 0;
    const tick = () => {
      shown += (loadRef.current - shown) * 0.12;
      altitude.textContent = Math.round(shown * SUMMIT_ALTITUDE).toLocaleString('en-US');
      bar.style.transform = `scaleX(${shown})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      altitude.textContent = SUMMIT_ALTITUDE.toLocaleString('en-US');
      bar.style.transform = 'scaleX(1)';
    };
  }, [status]);

  useEffect(() => {
    const onScroll = () => syncScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    let resizeObserver = null;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(document.body);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('load', measure);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [measure, syncScroll]);

  // Highlight whichever stop crosses the middle of the screen.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveId(entry.target.id);
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    CHECKPOINTS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (status === 'loading' || routedRef.current) return;
    routedRef.current = true;
    const target = ROUTE_TARGETS[location.pathname];
    if (target) jumpTo(target);
  }, [status, location.pathname, jumpTo]);

  useEffect(() => {
    nightRef.current = night;
    if (sceneRef.current) sceneRef.current.setNight(night);
  }, [night]);

  const toggleNight = useCallback(() => setNight((on) => !on), []);

  let index = 0;
  const nextIndex = () => {
    index += 1;
    return index;
  };

  return (
    <div className={`descent descent--${status}${nameReady ? ' descent--snow-name' : ''}`}>
      <canvas ref={canvasRef} className="descent__canvas" aria-hidden="true" />
      <div className="descent__shade" aria-hidden="true" />
      {flash > 0 && <div key={flash} className="descent__flash" aria-hidden="true" />}

      <div className="loader" aria-hidden="true">
        <p className="loader__label">{status === 'loading' ? 'Ascending' : 'Summit'}</p>
        <p className="loader__alt"><span ref={loaderAltRef}>0</span><span className="loader__unit">M</span></p>
        <span className="loader__track"><span ref={loaderBarRef} className="loader__fill" /></span>
      </div>

      <Hud
        ref={hudRef}
        checkpoints={CHECKPOINTS}
        marks={marks}
        activeId={activeId}
        onJump={jumpTo}
        night={night}
        onToggleNight={toggleNight}
        onSimple={onSimple}
      />

      <main className="stage">
        <section id="summit" className="summit" aria-labelledby="summit-title">
          <p className="summit__meta">
            <span>Summit</span>
            <span>8,848 M</span>
            <span>Software Engineer</span>
          </p>
          <h1 id="summit-title" ref={nameRef} className="summit__name">
            <span>Dylan</span> <span>Salmo</span>
          </h1>
          <p className="summit__intro">{HERO.intro}</p>
          <div className="summit__actions">
            <a className="btn btn--signal" href="#education" onClick={(event) => { event.preventDefault(); jumpTo('education'); }}>
              Drop in <span aria-hidden="true">↓</span>
            </a>
            <ExternalLink className="btn" href={LINKS.resume}>Résumé</ExternalLink>
          </div>
          <p className="summit__cue" aria-hidden="true">Scroll to descend</p>
        </section>

        <Leg id="education" side="right" index={nextIndex()} kicker="Drop-in" title="Education" mark={marks.education}>
          <EducationBody />
        </Leg>

        <Leg id="experience" side="left" index={nextIndex()} kicker="The couloir" title="Experience" mark={marks.experience} wide>
          <ExperienceBody />
        </Leg>

        {PROJECTS.map((project, i) => (
          <Leg
            key={project.id}
            id={project.id}
            side={project.side}
            index={nextIndex()}
            kicker={`Gate ${String(i + 1).padStart(2, '0')}${project.featured ? ' · Featured' : ''}`}
            title={project.name}
            mark={marks[project.id]}
          >
            <ProjectBody project={project} />
          </Leg>
        ))}

        <Leg id="skills" side="left" index={nextIndex()} kicker="Tree line" title="Skills" mark={marks.skills}>
          <SkillsBody />
        </Leg>

        <Leg id="about" side="right" index={nextIndex()} kicker="Après-ski" title="About" mark={marks.about} wide>
          <AboutBody />
        </Leg>

        <Leg id="contact" side="left" index={nextIndex()} kicker="Base lodge" title="Let's connect" mark={marks.contact} wide>
          <ContactBody footnote="There are a few secrets hidden on this mountain." />
        </Leg>
      </main>
    </div>
  );
}
