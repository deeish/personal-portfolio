import React from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css';
import Button from '@mui/material/Button';

function NavBar() {
    return (
      <div className="navbar-container">
        <div className="logo">
            <img src="/images/portpic1.svg" alt="Logo"/>
        </div>
        <div className="navbar-elements">
        <nav>
        <ul>
            <li>
              <Button component={Link} to="/" variant="outlined" color="inherit">Home</Button>
            </li>
            <li>
              <Button component={Link} to="/about" variant="outlined" color="inherit">About</Button>
            </li>
            <li>
              <Button component={Link} to="/contact" variant="outlined" color="inherit">Contact</Button>
            </li>
          </ul>
        </nav>
        </div>
      </div>
    );
  }

export default NavBar;
