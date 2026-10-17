import React, { Suspense, lazy, useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import SimpleView from "./descent/SimpleView";

// The 3D run (and three.js with it) only downloads when someone takes the run.
const Descent = lazy(() => import("./descent/Descent"));

const prefersReducedMotion = () =>
  Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// Picks the 3D run or the simple page. `?view=run` / `?view=simple` override the
// default, which follows the visitor's reduced-motion setting.
function Portfolio() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unsupported, setUnsupported] = useState(false);
  // The section a visitor was on when they left the run, so the simple page opens there too.
  const [section, setSection] = useState(null);
  const requested = new URLSearchParams(location.search).get("view");
  let view = requested === "run" || requested === "simple" ? requested : prefersReducedMotion() ? "simple" : "run";
  if (unsupported) view = "simple";

  const show = useCallback(
    (next, fromSection = null) => {
      setSection(fromSection);
      if (!fromSection) window.scrollTo(0, 0);
      navigate({ pathname: location.pathname, search: `?view=${next}` });
    },
    [navigate, location.pathname]
  );
  const showSimple = useCallback((fromSection) => show("simple", fromSection), [show]);
  const markUnsupported = useCallback((fromSection) => {
    setSection(fromSection || null);
    setUnsupported(true);
  }, []);

  if (view === "simple") return <SimpleView canRun={!unsupported} onRun={() => show("run")} section={section} />;
  return (
    <Suspense fallback={<div className="boot" aria-hidden="true" />}>
      <Descent onSimple={showSimple} onUnsupported={markUnsupported} />
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<Portfolio />} />
      </Routes>
    </Router>
  );
}

export default App;
