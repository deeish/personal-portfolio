# Dylan Salmo's Portfolio

A modern, responsive portfolio website showcasing my projects and skills as a software developer.

## Features

- **Home Page**: Hero section with introduction and quick links to social profiles
- **About Page**: Personal background, skills, and interests
- **Projects Page**: Showcase of featured projects with descriptions, technologies, and links
- **Contact Page**: Functional contact form with EmailJS integration

## Technologies Used

- **Frontend**: React 18, React Router, Custom CSS
- **UI Components**: Material-UI (for notifications only)
- **Email Service**: EmailJS (free alternative to backend hosting)
- **Deployment**: Netlify (Frontend)

## Setup

### Prerequisites

- Node.js (v14 or higher) and npm installed on your machine
- Git installed on your machine

### Installation

1. Clone the repository:
```bash
git clone https://github.com/deeish/personal-portfolio.git
cd personal-portfolio
```

2. Install dependencies:
```bash
npm install
```

3. Set up EmailJS for contact form (optional but recommended):
   - Sign up for a free account at [EmailJS](https://www.emailjs.com/)
   - Create an email service (Gmail, Outlook, etc.)
   - Create an email template with variables: `{{from_name}}`, `{{from_email}}`, `{{message}}`
   - Get your Public Key from Account > API Keys
   - Create a `.env` file in the root directory:
   ```env
   REACT_APP_EMAILJS_SERVICE_ID=your_service_id
   REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
   REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
   ```

4. Run the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Project Structure

```
src/
├── components/     # Reusable components (NavBar, InfoBox)
├── pages/          # Page components (Home, About, Projects, Contact)
├── config/         # Configuration files (project URLs, etc.)
└── App.js          # Main app component with routing
```

## Configuration

Project-specific URLs and links are configured in `src/config/projects.js` for easy updates.

## License

ISC