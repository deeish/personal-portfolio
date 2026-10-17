import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { LINKS } from './content';

const formatAltitude = (value) => Math.round(value).toLocaleString('en-US');

// The instrument panel: brand and controls up top, an altimeter rail that
// doubles as section navigation, live readouts fed by the 3D scene, and a
// message line for the mountain's surprises.
const Hud = forwardRef(function Hud(
  { checkpoints, marks, activeId, onJump, night, onToggleNight, onSimple },
  ref,
) {
  const altitudeRef = useRef(null);
  const speedRef = useRef(null);
  const temperatureRef = useRef(null);
  const markerRef = useRef(null);
  const shown = useRef({});

  useImperativeHandle(ref, () => ({
    update({ altitude, speed, temperature, progress }) {
      const next = {
        altitude: formatAltitude(altitude),
        speed: String(Math.round(speed)),
        temperature: String(Math.round(temperature)).replace('-', '−'),
      };
      if (altitudeRef.current && next.altitude !== shown.current.altitude) altitudeRef.current.textContent = next.altitude;
      if (speedRef.current && next.speed !== shown.current.speed) speedRef.current.textContent = next.speed;
      if (temperatureRef.current && next.temperature !== shown.current.temperature) temperatureRef.current.textContent = next.temperature;
      shown.current = next;
      if (markerRef.current) markerRef.current.style.top = `${(progress * 100).toFixed(2)}%`;
    },
  }), []);

  const activeIndex = Math.max(0, checkpoints.findIndex((c) => c.id === activeId));
  const measured = Object.keys(marks).length > 0;
  const jump = (id) => (event) => {
    event.preventDefault();
    onJump(id);
  };

  return (
    <>
      <header className="hud-top">
        <a href="#summit" className="hud-brand" onClick={jump('summit')}>
          <img
            src={`${process.env.PUBLIC_URL}/images/DS_logo_kit/DS_icon_white_transparent_64.png`}
            alt=""
            width="32"
            height="32"
          />
          <span>Dylan Salmo</span>
        </a>
        <nav className="hud-links" aria-label="Site">
          <button type="button" className="hud-night" aria-pressed={night} onClick={onToggleNight}>
            <span className="hud-night__icon" aria-hidden="true">{night ? '☾' : '☀'}</span>
            <span className="hud-night__label">{night ? 'Night' : 'Day'}</span>
          </button>
          <button type="button" className="hud-simple" onClick={onSimple}>Simple view</button>
          <a href={LINKS.resume} target="_blank" rel="noopener noreferrer">Résumé</a>
          <a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </nav>
      </header>

      <nav className={`hud-rail${measured ? ' is-measured' : ''}`} aria-label="Sections">
        <div className="hud-rail__track">
          <span className="hud-rail__marker" ref={markerRef} aria-hidden="true" />
          <ol>
            {checkpoints.map((checkpoint) => (
              <li
                key={checkpoint.id}
                style={{ top: `${((marks[checkpoint.id] && marks[checkpoint.id].p) || 0) * 100}%` }}
                className={checkpoint.id === activeId ? 'is-active' : undefined}
              >
                <a
                  href={`#${checkpoint.id}`}
                  onClick={jump(checkpoint.id)}
                  aria-current={checkpoint.id === activeId ? 'location' : undefined}
                >
                  {checkpoint.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="hud-readout" aria-hidden="true">
        <div className="hud-readout__alt">
          <span className="hud-readout__label">ALT</span>
          <span ref={altitudeRef}>8,848</span>
          <span className="hud-readout__unit">M</span>
        </div>
        <div className="hud-readout__row">
          <span><span className="hud-readout__label">SPD</span> <span ref={speedRef}>0</span> KM/H</span>
          <span><span className="hud-readout__label">TMP</span> <span ref={temperatureRef}>−53</span>°C</span>
        </div>
        <div className="hud-readout__section">
          <span className="hud-readout__count">
            {String(activeIndex + 1).padStart(2, '0')}/{String(checkpoints.length).padStart(2, '0')}
          </span>
          {checkpoints[activeIndex].label}
        </div>
      </div>
    </>
  );
});

export default Hud;
