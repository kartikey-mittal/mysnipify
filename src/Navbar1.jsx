import React, { useState, useEffect } from 'react';
import Logo from './assets/snipify_1.png'
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './Firebase';
import {
  FaGraduationCap,
} from 'react-icons/fa';
const Navbar1 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [balance, setBalance] = useState(null);
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
  const [activeButton, setActiveButton] = useState('');


  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    const email = localStorage.getItem('LearnerEmail') || '';
    if (!email) return;
    getDocs(query(collection(db, 'Learner'), where('Email', '==', email)))
      .then((snap) => {
        if (!snap.empty) {
          const bal = snap.docs[0].data().creditBalance;
          setBalance(bal === undefined || bal === null ? 500 : bal);
        }
      })
      .catch(() => {});
  }, []);

  const isActive = (key) => {
    if (key === 'red') return location.pathname === '/learner/home';
    if (key === 'green') return location.pathname === '/learner/find-tutor';
    if (key === 'pink') return location.pathname === '/ai-genie';
    return false;
  };

  const handleSessionsClick = () => {
    setActiveButton('pink');
    // Navigate to 'ai-genie'
    navigate('/ai-genie');
  };
  const handleBookSession = () => {
    setActiveButton('green');
    navigate('/learner/find-tutor');
  };

  return (
    <div style={navbarStyle}>
      <div style={blueContainerStyle} onClick={() => navigate('/learner/home')}>
        <img src={Logo} alt="Logo" style={{height:'100%', cursor:'pointer'}} />
      </div>

      <div
        style={{...buttonStyle('white', isActive('red')), marginLeft: 'auto'}}
        onClick={() => { setActiveButton('red'); navigate('/learner/home'); }}
      >
        Instant
      </div>
      <div
        style={{...buttonStyle('white', isActive('green'))}}
        onClick={handleBookSession}
      >
        Book Session
      </div>
      <div
        style={{...buttonStyle('white', isActive('pink'))}}
        onClick={() => { setActiveButton('pink'); handleSessionsClick(); }}
      >
        AI Genie
      </div>

      <div
        onClick={() => navigate('/learner/wallet')}
        style={{
          backgroundColor: '#FFF4E8',
          color: '#5813EA',
          borderRadius: 100,
          padding: '6px 16px',
          marginRight: 12,
          fontFamily: 'DMM',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          border: '2px solid #5813EA',
        }}
        title="My Credits"
      >
        ₹{balance === null ? '--' : balance}
      </div>

      <div style={{ position: 'relative' }}>
      <div
  onClick={() => setDropdownOpen(!dropdownOpen)}
  style={{
    backgroundColor: '#DBEAFE',
    borderRadius: '50%',
    height: 40,
    width: 40,
    marginRight: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #BFDBFE',
  }}
>
  <FaGraduationCap
    style={{
      fontSize: 19,
      color: '#3B82F6',
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

export default Navbar1;