import React, { useState } from 'react';
import Logo from './assets/snipify_1.png'
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRightFromBracket,
  faUser
} from '@fortawesome/free-solid-svg-icons';
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navbarStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#fff',
    boxShadow: '0px 10px 15px rgba(0, 0, 0, 0.1)',
    width: 'calc(100% - 20px)',
    height: '8%',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };


  const blueContainerStyle = {
    width: '125px',
    height: '40px',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const buttonStyle = (color, isActive) => ({
    width: 'auto',
    height: '38px',
    backgroundColor: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderBottom: `2.5px solid ${isActive ? '#5813EA' : 'transparent'}`,
    paddingLeft: 12,
    paddingRight: 12,
    marginRight:10,
    Fontfamily:'DMM',
    fontSize: 17,
    fontWeight: isActive ? 700 : 600,
    color: isActive ? '#5813EA' : '#000',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const isActive = (key) => {
    if (key === 'red') return location.pathname === '/skilled/home';
    if (key === 'green') return location.pathname === '/skilled/availability';
    if (key === 'pink') return location.pathname === '/skilled/bookedsessions';
    return false;
  };

  const handleSessionsClick = () => {
    // Navigate to 'skilled/bookedsessions'
    navigate('/skilled/bookedsessions');
  };
  const handleAvailabilityClick = () => {
    navigate('/skilled/availability');
  };

  return (
    <div style={navbarStyle}>
      <div style={blueContainerStyle} onClick={() => navigate('/skilled/home')}>
        <img src={Logo} alt="Logo" style={{height:'100%', cursor:'pointer'}} />
      </div>
      <div
        style={{...buttonStyle('white', isActive('red')), marginLeft: 'auto'}}
        onClick={() => navigate('/skilled/home')}
      >
        Instant
      </div>
      <div
        style={{...buttonStyle('white', isActive('green'))}}
        onClick={handleAvailabilityClick}
      >
        Manage Availability
      </div>
      <div
        style={{...buttonStyle('white', isActive('pink'))}}
        onClick={handleSessionsClick}
      >
        Sessions
      </div>
      <div style={{ position: 'relative' }}>
       <div
  onClick={() => setDropdownOpen(!dropdownOpen)}
  style={{
    backgroundColor: '#FCE7F3',
    border: '1px solid #FBCFE8',
    borderRadius: '50%',
    height: 40,
    width: 40,
    marginRight: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
  }}
>
  <FontAwesomeIcon
    icon={faUser}
    style={{
      fontSize: 16,
      color: '#DB2777',
    }}
  />
</div>
        {dropdownOpen && (
          <div style={{ position: 'absolute', right: 20, top: 55, zIndex: 200, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB', minWidth: 150, fontFamily: 'DMM', overflow: 'hidden' }}>
            <div
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', cursor: 'pointer', color: '#111827', fontSize: 14, fontWeight: 400, transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#F3F4F6')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize: 13 }} />
              Logout
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;