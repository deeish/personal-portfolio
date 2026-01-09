import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import EmailIcon from '@mui/icons-material/Email';
import './NavBar.css';

function NavBar() {
    const location = useLocation();
    
    const navItems = [
        { path: '/', label: 'Home', icon: HomeIcon },
        { path: '/about', label: 'About', icon: PersonIcon },
        { path: '/projects', label: 'Projects', icon: FolderIcon },
        { path: '/contact', label: 'Contact', icon: EmailIcon },
    ];
    
    return (
      <nav className="navbar-container" role="navigation" aria-label="Main navigation">
        <a href="/" className="logo" aria-label="Dylan Salmo - Home">
            <img src="/images/DS_logo_kit/DS_icon_white_transparent_64.png" alt="Dylan Salmo Logo" width="64" height="64"/>
        </a>
        <div className="navbar-elements">
          <ul>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                    <li key={item.path}>
                      <Link 
                        to={item.path} 
                        className={isActive ? 'active' : ''}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={`Navigate to ${item.label} page`}
                      >
                        <Icon className="nav-icon" aria-hidden="true" />
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    </li>
                );
            })}
          </ul>
        </div>
      </nav>
    );
  }

export default NavBar;
