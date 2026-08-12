
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/snipify_ob.png';
import Github from '../assets/github.png';
import videoFile from '../assets/snipifygfg.mp4';
import {
  FaSignInAlt,
  FaUserPlus,
  FaGithub,
  FaArrowRight,
  FaPlayCircle
} from 'react-icons/fa';

const TeamWork = () => {
  const navigate = useNavigate();
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 900);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClick = () => navigate('/login');
  const handleClick1 = () => navigate('/signup');

  return (
    <div style={styles.page}>
      

      <div style={styles.gridOverlay} />

      <div
        style={{
          ...styles.wrapper,
          flexDirection: isMobileView ? 'column' : 'row'
        }}
      >
        <div
          style={{
            ...styles.leftCol,
            alignItems: isMobileView ? 'center' : 'flex-start',
            textAlign: isMobileView ? 'center' : 'left'
          }}
        >
          <img
            src={Logo}
            alt="Logo"
            style={{
              height: isMobileView ? 110 : 180,
              width: 'auto'
            }}
          />

          <div style={styles.headline}>
            Snip your workflow.
            <br />
            Connect with <span style={{color:"yellow"}}>skilled </span>  minds.
          </div>

          <div style={styles.subline}>
            Join a community where learners and skilled folks team up to
            build, teach, and grow together.
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobileView ? 'column' : 'row',
              gap: 14,
              marginTop: 28,
              width: isMobileView ? '100%' : 'auto'
            }}
          >
            <button
              style={styles.loginButton}
              onClick={handleClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 10px 24px rgba(0,0,0,0.20)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(0,0,0,0.15)';
              }}
            >
              <FaSignInAlt style={{ fontSize: 18 }} />

              <span style={styles.btnTextCol}>
                <span style={styles.btnSubtext}>
                  Already have an account?
                </span>

                <span style={styles.btnMaintext}>
                  Login
                </span>
              </span>
            </button>

            <button
              style={styles.signupButton}
              onClick={handleClick1}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 10px 24px rgba(255,123,106,0.42)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(255,123,106,0.35)';
              }}
            >
              <FaUserPlus style={{ fontSize: 18 }} />

              <span style={styles.btnTextCol}>
                <span
                  style={{
                    ...styles.btnSubtext,
                    color: 'rgba(255,255,255,0.75)'
                  }}
                >
                  New to Snipify?
                </span>

                <span style={styles.btnMaintext}>
                  Sign up
                </span>
              </span>

              <FaArrowRight
                style={{
                  fontSize: 13,
                  marginLeft: 4
                }}
              />
            </button>
          </div>

          <button
            style={styles.githubButton}
            onClick={() =>
              window.open(
                'https://github.com/kartikey-mittal/mysnipify/',
                '_blank'
              )
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#21262d';
              e.currentTarget.style.borderColor =
                'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#161b22';
              e.currentTarget.style.borderColor =
                'rgba(255,255,255,0.18)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <img
              src={Github}
              alt="GitHub"
              style={{
                height: 22,
                width: 22
              }}
            />

            View GitHub Repo

            <FaGithub
              style={{
                fontSize: 15,
                opacity: 0.8
              }}
            />
          </button>
        </div>

        <div
          style={{
            ...styles.rightCol,
            marginTop: isMobileView ? 36 : 0
          }}
        >
          <div style={styles.videoFrame}>
            <div style={styles.videoBadge}>
              <FaPlayCircle style={{ fontSize: 12 }} />
              Watch how it works
            </div>

            <video
              width="100%"
              height="100%"
              controls
              poster={Logo}
              style={styles.video}
            >
              <source
                src={videoFile}
                type="video/mp4"
              />

              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
    padding: '40px 24px',
    overflow: 'hidden',
    background: '#5813ea'
  },

  gridOverlay: {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage: `
    repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 49px,
      rgba(255,255,255,0.60) 50px,
      transparent 51px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 49px,
      rgba(255,255,255,0.60) 50px,
      transparent 51px
    )
  `,
  backgroundSize: '50px 50px',
  animation: 'gridMove 14s linear infinite',
  opacity: 0.75,
  zIndex: 0,
},

  wrapper: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 64,
    width: '100%',
    maxWidth: 1240
  },

  leftCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },

  headline: {
    fontFamily: 'DMM',
    fontSize: 34,
    fontWeight: 700,
    color: 'white',
    lineHeight: 1.25,
    marginTop: 22
  },

  subline: {
    fontFamily: 'DMM',
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 12,
    maxWidth: 420,
    lineHeight: 1.6
  },

  loginButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 30px',
    borderRadius: 14,
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    background: 'white',
    color: '#111827',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    fontFamily: 'DMM',
    transition: 'all 0.2s ease'
  },

  signupButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 30px',
    borderRadius: 14,
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(90deg, #FF7B6A, #FF9A6A)',
    color: 'white',
    boxShadow: '0 6px 16px rgba(255,123,106,0.35)',
    fontFamily: 'DMM',
    transition: 'all 0.2s ease'
  },

  btnTextCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    lineHeight: 1.5
  },

  btnSubtext: {
    fontSize: 10.5,
    color: '#9CA3AF'
  },

  btnMaintext: {
    fontSize: 16,
    fontWeight: 600
  },

  githubButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    padding: '11px 18px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.18)',
    outline: 'none',
    cursor: 'pointer',
    background: '#161b22',
    color: '#f0f6fc',
    fontSize: 14,
    fontFamily: 'DMM',
    boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
    transition: 'all 0.2s ease'
  },

  rightCol: {
    flex: 1.15,
    display: 'flex',
    justifyContent: 'center',
    minWidth: 0
  },

  videoFrame: {
    position: 'relative',
    width: '100%',
    maxWidth: 620,
    borderRadius: 26,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: '0 24px 70px rgba(0,0,0,0.32)'
  },

  videoBadge: {
    position: 'absolute',
    top: -14,
    left: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#171515',
    color: 'white',
    fontSize: 11.5,
    fontFamily: 'DMM',
    padding: '5px 12px',
    borderRadius: 100,
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
    zIndex: 2
  },

  video: {
    borderRadius: 18,
    display: 'block',
    width: '100%',
    height: 'auto'
  }
};

export default TeamWork;

