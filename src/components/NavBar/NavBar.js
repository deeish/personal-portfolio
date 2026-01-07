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
      <div className="navbar-container">
        <div className="logo">
            <img src="/images/DS_logo_kit/DS_icon_white_transparent_64.png" alt="Dylan Salmo Logo"/>
        </div>
        <div className="navbar-elements">
        <nav>
        <ul>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                    <li key={item.path}>
                      <Link 
                        to={item.path} 
                        className={isActive ? 'active' : ''}
                      >
                        <Icon className="nav-icon" />
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    </li>
                );
            })}
          </ul>
        </nav>
        </div>
      </div>
    );
  }

export default NavBar;
