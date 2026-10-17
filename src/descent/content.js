// Everything the descent shows, in the order you ski past it.
import { PROJECTS_CONFIG } from '../config/projects';

const PUBLIC = process.env.PUBLIC_URL;

export const LINKS = {
  resume: `${PUBLIC}/Resume.docx.pdf`,
  github: 'https://github.com/deeish',
  linkedin: 'https://www.linkedin.com/in/dylan-salmo-86a526236/',
  x: 'https://twitter.com/SalmoDylan',
  instagram: 'https://www.instagram.com/deeish_1/',
  email: 'dylansalmo@gmail.com',
};

export const HERO = {
  intro:
    'A creative software engineer passionate about crafting elegant solutions and bringing ideas to life through code. I build full-stack applications and adapt fast. Whatever the role needs, I\'m ready to learn it.',
};

export const ABOUT = {
  photo: `${PUBLIC}/images/Dylan-portrait.jpg`,
  intro:
    'I\'m Dylan Salmo, a software engineer passionate about creating elegant digital experiences. I graduated with a B.S. in Computer Science from Cal State Fullerton and bring real-world experience from two software engineering internships — building full-stack features, writing SQL for production databases, and shipping React UI components with cross-functional teams.',
  sections: [
    {
      heading: 'What I do',
      text: 'I thrive on solving complex problems and turning ideas into reality through code. My work spans from developing efficient database algorithms using SQL to collaborating with cross-functional teams to build robust, maintainable applications. I\'m always exploring new technologies and best practices to deliver solutions that are both functional and beautifully designed.',
    },
    {
      heading: 'Beyond the screen',
      text: 'When I\'m not coding, you\'ll find me embracing an active lifestyle. Winter means hitting the slopes for skiing, while the rest of the year I\'m at the gym, playing sports, or exploring the outdoors. For downtime, I enjoy video games and board games with friends and family. These activities keep me balanced, energized, and bring fresh perspectives to my work.',
    },
  ],
};

export const EDUCATION = {
  school: 'California State University, Fullerton',
  degree: 'B.S. in Computer Science',
  date: 'Graduated December 2025',
  coursework: [
    'Algorithm Engineering',
    'Operating System Concepts',
    'Software Engineering',
    'Web Front-End Engineering',
    'File Structure & Database',
    'Artificial Intelligence',
    'Computer Communications',
    'Senior Capstone Project',
  ],
};

export const EXPERIENCE = [
  {
    company: 'Agiline Software',
    location: 'Glendora, CA',
    role: 'Software Engineering Intern',
    date: 'May 2023 – Sep 2023',
    bullets: [
      'Wrote and refined SQL queries to extract, validate, and present data from a production database for internal reporting and analysis.',
      'Built SQL-based logic (filters, joins, aggregations) to support data views and improve how information was visualized inside the company\'s software.',
      'Contributed React UI components in collaboration with engineers to ship features and improvements.',
    ],
  },
  {
    company: 'Agiline Software',
    location: 'Glendora, CA',
    role: 'Software Engineering Intern',
    date: 'Jun 2022 – Aug 2022',
    bullets: [
      'Built responsive UI components using HTML, CSS, JavaScript, and React, improving usability and consistency across pages.',
      'Collaborated with engineers in an agile workflow (tickets, code reviews) to ship features and bug fixes on schedule.',
      'Integrated front-end views with back-end endpoints to display dynamic content and handle user input reliably.',
    ],
  },
  {
    company: 'Diamond International',
    location: 'Cypress, CA',
    role: 'Sales Associate & Operations Support',
    date: '2015 – Present',
    bullets: [
      'Handled customer sales and pricing, building long-term relationships with repeat clientele.',
      'Served as the in-house tech resource, diagnosing and resolving hardware and software issues to keep daily operations running smoothly.',
      'Supported inventory management, filing, and day-to-day administrative tasks across a small business environment.',
    ],
  },
];

// `side` is where the card sits on screen; the project's ice block appears on the other
// side of the run, with `icon` frozen inside it (see IceBlocks for the shapes).
export const PROJECTS = [
  {
    id: 'mycabinet',
    side: 'right',
    icon: 'cocktail',
    name: 'MyCabinet',
    featured: true,
    tagline: 'Cocktail Enthusiast Mobile Application',
    description:
      'A full-stack mobile application for cocktail enthusiasts featuring an extensive cocktail database with detailed recipes, personalized recommendations based on your ingredient cabinet, and an AI assistant for cocktail help. Users can track ingredients, save favorite recipes, manage shopping lists, and discover new drinks tailored to what they have available. Built as a capstone project showcasing full-stack development skills.',
    features: [
      'Extensive cocktail database with recipes (TheCocktailDB API)',
      'Personal ingredient cabinet tracking and management',
      'Personalized cocktail recommendations based on available ingredients',
      'AI assistant chat for cocktail help and suggestions',
      'Save favorites and manage shopping lists',
      'User authentication and profile management',
    ],
    tech: ['TypeScript', 'React Native', 'FastAPI', 'Python', 'PostgreSQL'],
    // The demo video (PROJECTS_CONFIG.MYCABINET.youtubeUrl) was taken down by YouTube.
    // Set `video` to an embed URL like `https://www.youtube.com/embed/<id>` once there is a new upload.
    video: null,
    links: [{ label: 'View on GitHub', href: PROJECTS_CONFIG.MYCABINET.githubUrl }],
  },
  {
    id: 'jim-app',
    side: 'left',
    icon: 'dumbbell',
    name: 'Jim App',
    tagline: 'AI-Powered Mobile Gym Planner',
    description:
      'An iPhone app for planning and logging gym workouts, live in beta on TestFlight. Google Gemini builds a multi-week plan from your goal, schedule and equipment; the backend checks it against a curated exercise catalog, repairs what\'s off, and falls back to a rule-based builder if the model fails. Built with React Native/Expo and a NestJS API on PostgreSQL (Prisma), with Supabase authentication.',
    features: [
      'AI-generated workout plans powered by Google Gemini, with a rule-based fallback',
      'Calendar planning: move or remove sessions and save your own workouts as routines',
      'Live workout logging with a rest timer and per-exercise history and personal bests',
      'Exercise library with search, a tappable muscle map, and swap suggestions',
      'Crew: a social tab for training alongside friends',
      'Sign in with Apple, Google, or an emailed code',
    ],
    tech: ['TypeScript', 'React Native', 'Expo', 'NestJS', 'PostgreSQL', 'Prisma', 'Supabase', 'Gemini AI'],
    // The GitHub repo is private, so link the product site instead.
    links: [{ label: 'Visit site', href: 'https://jimplanner.app' }],
  },
  {
    id: 'tichu',
    side: 'right',
    icon: 'cards',
    name: 'Tichu',
    tagline: 'Real-Time Multiplayer Card Game',
    description:
      'A web implementation of Tichu, a 4-player partnership trick-taking card game. Features real-time multiplayer via Socket.IO with game rooms, chat, full game logic (Grand Tichu declarations, card exchanges, special cards), and a token-based reconnection system. Deployed and fully playable.',
    features: [
      'Real-time multiplayer game rooms via Socket.IO',
      'Complete Tichu rules (Grand Tichu, card exchanges, special cards)',
      'Team scoring and partnership mechanics',
      'In-game chat and player panels',
      'Token-based reconnection for dropped connections',
      'Mobile and desktop responsive with touch support',
    ],
    tech: ['JavaScript', 'React', 'Node.js', 'Socket.IO', 'Redis'],
    links: [
      { label: 'Live demo', href: 'https://calltichu.com' },
      { label: 'View on GitHub', href: 'https://github.com/deeish/Tichu' },
    ],
  },
];

export const SKILLS = [
  { label: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'SQL', 'Java', 'C/C++'] },
  { label: 'Frontend', items: ['React', 'React Native', 'HTML', 'CSS'] },
  { label: 'Backend', items: ['Node.js', 'FastAPI', 'NestJS', 'Express'] },
  { label: 'Databases', items: ['PostgreSQL', 'SQLite', 'Redis', 'Supabase'] },
  { label: 'Tools', items: ['Git', 'GitHub Actions', 'Alembic', 'pytest'] },
  { label: 'Deployment', items: ['Netlify', 'Heroku', 'Vercel', 'Render'] },
];

// Old page URLs land on the matching section.
export const ROUTE_TARGETS = { '/about': 'about', '/projects': 'mycabinet', '/contact': 'contact' };

// Stops on the way down, top to bottom. Each id matches a section on the page.
export const CHECKPOINTS = [
  { id: 'summit', label: 'Summit' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  ...PROJECTS.map(({ id, name }) => ({ id, label: name })),
  { id: 'skills', label: 'Skills' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Lodge' },
];
