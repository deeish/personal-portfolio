import { render, screen } from '@testing-library/react';
import App from './App';

// jsdom has no WebGL, and three.js only ships ES modules, so stand in a scene
// that fails the way a browser without WebGL would.
jest.mock('./descent/scene/MountainScene', () => ({
  __esModule: true,
  SceneCancelled: class SceneCancelled extends Error {},
  default: function MountainScene() {
    throw new Error('WebGL is not available');
  },
}));

const SECTIONS = ['Education', 'Experience', 'MyCabinet', 'Jim App', 'Tichu', 'Skills', 'About', "Let's connect"];

afterEach(() => {
  window.history.pushState({}, '', '/');
  delete window.matchMedia;
});

// jsdom has no matchMedia either; this one answers like a phone's touch screen.
const actLikeAPhone = () => {
  window.matchMedia = (query) => ({
    matches: query.includes('pointer: coarse'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
};

test('falls back to the simple page, with every section, when WebGL is unavailable', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: /dylan salmo/i })).toBeInTheDocument();
  SECTIONS.forEach((title) => expect(screen.getByRole('heading', { name: title })).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: /take the run/i })).not.toBeInTheDocument();
});

test('?view=simple shows the simple page with a way into the run', () => {
  window.history.pushState({}, '', '/?view=simple');
  render(<App />);
  SECTIONS.forEach((title) => expect(screen.getByRole('heading', { name: title })).toBeInTheDocument());
  expect(screen.getAllByRole('button', { name: /take the run/i }).length).toBeGreaterThan(0);
});

test('phones open on the simple page, with a way into the run', () => {
  actLikeAPhone();
  render(<App />);
  SECTIONS.forEach((title) => expect(screen.getByRole('heading', { name: title })).toBeInTheDocument());
  expect(screen.getAllByRole('button', { name: /take the run/i }).length).toBeGreaterThan(0);
});
