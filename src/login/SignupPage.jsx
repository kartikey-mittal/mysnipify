
import React, { useState, useEffect } from 'react';
import Logo from '../assets/snipify_ob.png';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../Firebase';
import { useNavigate } from 'react-router-dom';

import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaToolbox,
  FaArrowRight,
  FaCheck,
} from 'react-icons/fa';

const SignUpPage = () => {
  const [isLeftSectionVisible, setIsLeftSectionVisible] = useState(
    window.innerWidth > 780
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLeftSectionVisible(window.innerWidth > 780);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedButton, setSelectedButton] = useState(null);
  const [enteredName, setEnteredName] = useState('');
  const [enteredEmail, setEnteredEmail] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleButtonClick = (buttonName) => {
    setSelectedButton(buttonName);
  };

  const createAccount = async (role, nameInput, emailInput, passwordInput) => {
    const name = nameInput.trim();
    const email = emailInput.trim();
    const password = passwordInput.trim();

    if (!role || !name || !email || !password) return;

    setSubmitting(true);

    try {
      const userCollection = role === 'learner' ? 'Learner' : 'Skilled';

      // Check if email already exists
      const existingUserQuery = query(
        collection(db, userCollection),
        where('Email', '==', email)
      );

      const existingUserSnapshot = await getDocs(existingUserQuery);

      if (!existingUserSnapshot.empty) {
        alert(
          `An account with this email already exists as ${
            role === 'learner' ? 'Learner' : 'Tutor'
          }.`
        );
        setSubmitting(false);
        return;
      }

      // Create new account
      const docRef = await addDoc(collection(db, userCollection), {
        Name: name,
        Email: email,
        Password: password,
        Timestamp: serverTimestamp(),

        ...(role === 'learner'
          ? {
              creditBalance: 500,
            }
          : {}),
      });

      if (role === 'learner') {
        localStorage.setItem('LearnerName', name);
        localStorage.setItem('LearnerEmail', email);
        localStorage.setItem('LearnerId', docRef.id);

        navigate('/learner/home');
      } else {
        localStorage.setItem('SkilledName', name);
        localStorage.setItem('SkilledEmail', email);
        localStorage.setItem('SkilledId', docRef.id);

        navigate(`/skilled/profile/${docRef.id}`);
      }
    } catch (error) {
      console.error('Error saving data to Firestore:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueClick = () => {
    createAccount(
      selectedButton,
      enteredName,
      enteredEmail,
      enteredPassword
    );
  };

  // Demo Signup buttons
 const handleDemoSignup = (role) => {
  if (submitting) return;

  // Optional: role ko localStorage me save kar sakte ho
  // taaki login page par role preselect kar sako.
  localStorage.setItem('DemoLoginRole', role);

  navigate('/login');
};

  const isContinueButtonDisabled =
    !selectedButton ||
    !enteredName.trim() ||
    !enteredEmail.trim() ||
    !enteredPassword.trim() ||
    submitting;

  return (
    <div style={styles.container}>
      {/* Left brand panel */}
      {isLeftSectionVisible && (
        <div style={styles.leftSection}>
          <div style={styles.leftGlow} />

          <img
            src={Logo}
            alt="Logo"
            style={styles.logo}
          />
        </div>
      )}

      {/* Right form panel */}
      <div
        style={{
          ...styles.rightSection,
          width: isLeftSectionVisible ? '44%' : '100%',
        }}
      >
        {/* Mobile logo */}
        {!isLeftSectionVisible && (
          <img
            src={Logo}
            alt="Logo"
            style={styles.logoMobile}
          />
        )}

        <div style={styles.formContainer}>
          {/* Header */}
          <div style={styles.headerBlock}>
            <div style={styles.loginTitle}>
              Create your account
            </div>

            <div style={styles.loginSubtitle}>
              Ready to onboard into the community :)
            </div>
          </div>

          {/* Role */}
          <div style={styles.roleLabel}>
            I want to join as
          </div>

          <div style={styles.roleTabs}>
            {/* Learner */}
            <div
              style={{
                ...styles.roleCard,
                ...(selectedButton === 'learner'
                  ? styles.roleCardLearnerActive
                  : styles.roleCardLearner),
              }}
              onClick={() => handleButtonClick('learner')}
            >
              <div
                style={{
                  ...styles.roleIconWrap,
                  backgroundColor:
                    selectedButton === 'learner'
                      ? 'rgba(255,255,255,0.2)'
                      : '#DBEAFE',
                }}
              >
                <FaGraduationCap
                  style={{
                    fontSize: 17,
                    color:
                      selectedButton === 'learner'
                        ? 'white'
                        : '#3B82F6',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                  }}
                >
                  Learner
                </span>
              </div>

              {selectedButton === 'learner' && (
                <FaCheck
                  style={{
                    fontSize: 12,
                    marginLeft: 'auto',
                  }}
                />
              )}
            </div>

            {/* Tutor */}
            <div
              style={{
                ...styles.roleCard,
                ...(selectedButton === 'skilled'
                  ? styles.roleCardSkilledActive
                  : styles.roleCardSkilled),
              }}
              onClick={() => handleButtonClick('skilled')}
            >
              <div
                style={{
                  ...styles.roleIconWrap,
                  backgroundColor:
                    selectedButton === 'skilled'
                      ? 'rgba(255,255,255,0.2)'
                      : '#FCE7F3',
                }}
              >
                <FaToolbox
                  style={{
                    fontSize: 17,
                    color:
                      selectedButton === 'skilled'
                        ? 'white'
                        : '#DB2777',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                  }}
                >
                  Tutor
                </span>
              </div>

              {selectedButton === 'skilled' && (
                <FaCheck
                  style={{
                    fontSize: 12,
                    marginLeft: 'auto',
                  }}
                />
              )}
            </div>
          </div>

          {/* Full Name */}
          <div style={styles.fieldLabel}>
            Full name
          </div>

          <div style={styles.inputWrap}>
            <FaUser style={styles.inputIcon} />

            <input
              type="text"
              style={styles.inputField}
              placeholder="Enter your full name"
              value={enteredName}
              onChange={(event) =>
                setEnteredName(event.target.value)
              }
            />
          </div>

          {/* Email */}
          <div style={styles.fieldLabel}>
            Email
          </div>

          <div style={styles.inputWrap}>
            <FaEnvelope style={styles.inputIcon} />

            <input
              type="email"
              style={styles.inputField}
              placeholder="Enter your email"
              value={enteredEmail}
              onChange={(event) =>
                setEnteredEmail(event.target.value)
              }
            />
          </div>

          {/* Password */}
          <div style={styles.fieldLabel}>
            Password
          </div>

          <div style={styles.inputWrap}>
            <FaLock style={styles.inputIcon} />

            <input
              type={showPassword ? 'text' : 'password'}
              style={{
                ...styles.inputField,
                paddingRight: 42,
              }}
              placeholder="Create a password"
              value={enteredPassword}
              onChange={(event) =>
                setEnteredPassword(event.target.value)
              }
            />

            <div
              style={styles.eyeIcon}
              onClick={() =>
                setShowPassword((value) => !value)
              }
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>

          {/* Continue */}
          <button
            style={{
              ...styles.continueButton,
              opacity: isContinueButtonDisabled ? 0.5 : 1,
              cursor: isContinueButtonDisabled
                ? 'not-allowed'
                : 'pointer',
            }}
            onClick={handleContinueClick}
            disabled={isContinueButtonDisabled}
          >
            {submitting
              ? 'Creating account...'
              : 'Continue'}

            {!submitting && (
              <FaArrowRight
                style={{
                  fontSize: 12,
                }}
              />
            )}
          </button>

          {/* Demo buttons */}
          <div style={styles.demoRow}>
            <button
              style={{
                ...styles.demoButton,
                ...styles.demoButtonLearner,
              }}
              onClick={() => handleDemoSignup('learner')}
              disabled={submitting}
            >
              <FaGraduationCap
                style={{
                  fontSize: 13,
                }}
              />

              Demo Login as Learner
            </button>

            <button
              style={{
                ...styles.demoButton,
                ...styles.demoButtonSkilled,
              }}
              onClick={() => handleDemoSignup('skilled')}
              disabled={submitting}
            >
              <FaToolbox
                style={{
                  fontSize: 13,
                }}
              />

              Demo Login as Tutor
            </button>
          </div>

          {/* Demo hint */}
          <div style={styles.demoHint}>
            Visit  LOGIN  for Demo Account
          </div>

          {/* Terms */}
         
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: '100vh',
    width: '100%',
    fontFamily: 'DMM',
  },

  leftSection: {
    background: `
      radial-gradient(
        circle at 20% 20%,
        rgba(255,255,255,0.06),
        transparent 40%
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 50px,
        rgba(242,242,242,0.15) 50px,
        rgba(242,242,242,0.15) 51px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 50px,
        rgba(242,242,242,0.15) 50px,
        rgba(242,242,242,0.15) 51px
      ),
      linear-gradient(155deg, #4A0FC7, #7A3CF0)
    `,
    flex: '0 0 56%',
    color: 'white',
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    padding: 40,
    boxSizing: 'border-box',
  },

  leftGlow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)',
    top: -140,
    left: -100,
    pointerEvents: 'none',
  },

  logo: {
    height: 'auto',
    maxWidth: '65%',
    position: 'relative',
  },

  logoMobile: {
    height: 60,
    maxWidth: '70%',
    marginTop: 24,
    marginBottom: 10,
  },

  rightSection: {
    display: 'flex',
    flexDirection: 'column',

    backgroundColor: '#F5F3FE',

    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 42px,
        rgba(59, 130, 246, 0.04) 42px,
        rgba(59, 130, 246, 0.04) 43px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 42px,
        rgba(59, 130, 246, 0.05) 42px,
        rgba(59, 130, 246, 0.10) 43px
      )
    `,

    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },

  formContainer: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'white',
    margin: '30px 0',
    padding: '38px 40px 25px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    borderRadius: 15,
    boxShadow: '0 8px 15px rgba(88,19,234,0.08)',
    boxSizing: 'border-box',
  },

  headerBlock: {
    marginBottom: 8,
  },

  loginTitle: {
    color: '#111827',
    fontSize: 27,
    fontWeight: 700,
    textAlign: 'left',
  },

  loginSubtitle: {
    color: '#7D716A',
    fontSize: 14.5,
    marginTop: 5,
    textAlign: 'left',
  },

  roleLabel: {
    color: '#7D716A',
    fontSize: 13.5,
    marginTop: 24,
    marginBottom: 9,
    textAlign: 'left',
  },

  roleTabs: {
    display: 'flex',
    gap: 10,
    marginBottom: 6,
  },

  roleCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '13px 14px',
    minHeight: 62,
    borderRadius: 13,
    border: '1.5px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
  },

  roleCardLearner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    color: '#374151',
  },

  roleCardLearnerActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    color: 'white',
    boxShadow: '0 4px 14px rgba(59,130,246,0.28)',
  },

  roleCardSkilled: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FCE7F3',
    color: '#374151',
  },

  roleCardSkilledActive: {
    backgroundColor: '#DB2777',
    borderColor: '#DB2777',
    color: 'white',
    boxShadow: '0 4px 14px rgba(219,39,119,0.28)',
  },

  roleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  fieldLabel: {
    color: '#7D716A',
    fontSize: 13.5,
    marginTop: 19,
    marginBottom: 7,
    textAlign: 'left',
  },

  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },

  inputIcon: {
    position: 'absolute',
    left: 14,
    fontSize: 14,
    color: '#9CA3AF',
    pointerEvents: 'none',
  },

  inputField: {
    borderRadius: 11,
    padding: '13px 42px 13px 38px',
    width: '100%',
    border: '1px solid #E5E7EB',
    fontFamily: 'DMM',
    fontSize: 14.5,
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
  },

  eyeIcon: {
    position: 'absolute',
    right: 14,
    fontSize: 14,
    color: '#9CA3AF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },

  continueButton: {
    borderRadius: 12,
    marginTop: 28,
    padding: '14px',
    backgroundColor: '#5813EA',
    color: 'white',
    fontFamily: 'DMM',
    border: 'none',
    fontSize: 15,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.15s ease',
    width: '100%',
    boxSizing: 'border-box',
  },

  // Same demo buttons as Login page
  demoRow: {
    display: 'flex',
    gap: 5,
    marginTop: 12,
  },

  demoButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 0px',
    borderRadius: 11,
    border: '0.9px solid',
    cursor: 'pointer',
    fontFamily: 'DMM',
    fontSize: 14.5,
    fontWeight: 450,
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
  },

 demoButtonLearner: {
      backgroundColor: '#EFF6FF',
      borderColor: '#92C1FF',
      color: '#3B82F6',
    },
    demoButtonSkilled: {
      backgroundColor: '#FDF2F8',
      borderColor: '#EA78B7',
      color: '#DB2777',
    },

  demoHint: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 16,
    color: '#35bd3c',
    marginTop: 10,
    textAlign: 'center',
    fontFamily:"DMM"
  },

  termsText: {
    fontSize: 11.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 1.5,
  },
};

export default SignUpPage;

