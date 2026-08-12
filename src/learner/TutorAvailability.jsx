import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faArrowLeft,
  faArrowRight,
  faUserGraduate,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import Navbar1 from '../Navbar1';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { collection, doc, addDoc, getDocs, getDoc, updateDoc, runTransaction, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../Firebase';
import { getLearnerId } from '../utils/identity';
import { todayString, to12Hour, formatDate, formatDateShort } from '../utils/format';
import { getInitials, getAvatarColor } from '../utils/avatar';
import gif from '../assets/connection.gif';

/* ---------------- Design tokens ---------------- */
const INK = '#17102E';
const SUB = '#6B6284';
const FAINT = '#9C93B8';
const LINE = '#E9E5F6';
const PAPER = '#FAF9FF';
const VIOLET = '#5813EA';
const TEAL = '#0F9D78';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const dateParts = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return { day: '--', month: '---' };
  return { day: String(d.getDate()).padStart(2, '0'), month: MONTHS[d.getMonth()] };
};

const TutorAvailability = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedDomain = searchParams.get('domain');
  const navigate = useNavigate();

  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 615);
  const [tutor, setTutor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [confirmedSlot, setConfirmedSlot] = useState(null);
  const [bookingDone, setBookingDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 615);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tutorSnap = await getDoc(doc(db, 'Skilled', id));
        if (tutorSnap.exists()) {
          setTutor({ id: tutorSnap.id, ...tutorSnap.data() });
        }

        const today = todayString();
        const slotSnap = await getDocs(query(collection(db, 'TutorAvailability'), where('tutorId', '==', id)));
        const availableSlots = [];
        slotSnap.forEach((slotDoc) => {
          const data = slotDoc.data();
          if (!data.booked && data.date >= today) {
            availableSlots.push({ slotId: slotDoc.id, ...data });
          }
        });
        availableSlots.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
        setSlots(availableSlots);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tutor availability:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const primaryDomain = tutor && tutor.selectedSkills && tutor.selectedSkills.length > 0 ? tutor.selectedSkills[0] : '';
  const tutorName = tutor ? tutor.Name : 'Tutor';
  const identityColor = getAvatarColor(tutorName);

  const handleConfirmBooking = async () => {
    if (!bookingSlot) return;
    setErrorMessage('');
    try {
      const learnerName = localStorage.getItem('LearnerName') || 'Learner';
      const learnerEmail = localStorage.getItem('LearnerEmail') || '';
      const learnerId = await getLearnerId();
      const domain = requestedDomain && requestedDomain !== 'All' ? requestedDomain : primaryDomain;

      const slotRef = doc(db, 'TutorAvailability', bookingSlot.slotId);
      const bookingDoc = await runTransaction(db, async (transaction) => {
        const slotSnap = await transaction.get(slotRef);
        if (!slotSnap.exists() || slotSnap.data().booked) {
          throw new Error('This slot was just booked by someone else. Please pick another slot.');
        }

        const roomId = `booking-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const bookingRef = await addDoc(collection(db, 'Bookings'), {
          tutorId: id,
          tutorName: tutor.Name,
          learnerId: learnerId || '',
          learnerName,
          learnerEmail,
          domain,
          date: bookingSlot.date,
          startTime: bookingSlot.startTime,
          endTime: bookingSlot.endTime,
          status: 'booked',
          slotId: bookingSlot.slotId,
          roomId,
          createdAt: serverTimestamp(),
        });

        transaction.update(slotRef, { booked: true, bookedBy: learnerEmail, bookingId: bookingRef.id });
        return bookingRef;
      });

      console.log('Booking created with ID: ', bookingDoc.id);
      setConfirmedSlot(bookingSlot);
      setBookingSlot(null);
      setBookingDone(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
    }
  };

  /* ---------------- Layout shells ---------------- */
  const homeStyle = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
    background: `
      repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,133,244,0.5) 50px, rgba(66,133,244,0.5) 51px),
      repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(66,133,244,0.5) 50px, rgba(66,133,244,0.5) 51px),
      #5813ea`,
  };

  const contentStyle = {
    width: isMobileView ? '100%' : '85%',
    minHeight: '85vh',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.25)',
    boxShadow: '0 24px 60px -12px rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: PAPER,
  };

  const headingStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(8px)',
    borderBottom: `1px solid ${LINE}`,
  };

  const mainboxStyle = {
    flex: 1,
    width: '100%',
    boxSizing: 'border-box',
    padding: isMobileView ? 14 : '20px 22px 24px',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    textAlign: 'left',
  };

const TEAL = '#0F9D78';

const bookButtonStyle = {
  backgroundColor: TEAL,
  color: 'white',
  borderRadius: 10,
  border: 'none',
  fontFamily: 'DMM',
  padding: '10px 20px',
  outline: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  transition: 'all 0.15s ease',
};

const backButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  color: VIOLET,
  borderRadius: 10,
  border: '1px solid rgba(88,19,234,0.25)',
  fontFamily: 'DMM',
  padding: '10px 18px',
  outline: 'none',
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 400,
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
};
  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(23,16,46,0.45)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    padding: 16,
    boxSizing: 'border-box',
  };

  const modalStyle = {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    width: isMobileView ? '100%' : '420px',
    fontFamily: 'DMM',
    boxShadow: '0 24px 60px -12px rgba(23,16,46,0.35)',
  };

  const gifStyle = { marginTop: 50, width: '40%', height: '40%', objectFit: 'cover' };

  /* ---------------- Booking confirmed screen ---------------- */
  if (bookingDone) {
    return (
      <>
        <Navbar1 />
        <div style={homeStyle}>
          <div style={contentStyle}>
            <div style={headingStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    backgroundColor: TEAL,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px -2px rgba(15,157,120,0.4)',
                    flexShrink: 0,
                  }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 14 }} />
                </div>
                <div style={{ fontFamily: 'DMM', fontSize: 16, fontWeight: 600, color: INK }}>Booking Confirmed</div>
              </div>
            </div>
            <div style={{ ...mainboxStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 380 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    margin: '0 auto 18px',
                    borderRadius: 18,
                    backgroundColor: 'rgba(15,157,120,0.10)',
                    color: TEAL,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8, color: INK, fontFamily: 'DMM' }}>
                  Your session is booked!
                </div>
                <div style={{ color: SUB, marginBottom: 24, fontFamily: 'DMM', fontSize: 13.5, lineHeight: 1.6 }}>
                  {tutorName} · {formatDate(confirmedSlot ? confirmedSlot.date : '')} ·{' '}
                  {to12Hour(confirmedSlot ? confirmedSlot.startTime : '')} - {to12Hour(confirmedSlot ? confirmedSlot.endTime : '')}
                </div>
                <button style={bookButtonStyle} onClick={() => navigate('/learner/mybookings')}>
                  Go to My Bookings
                  <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 8 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar1 />
      <div style={homeStyle}>
        <div style={contentStyle}>
          {/* Header */}
          <div style={headingStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  backgroundColor: VIOLET,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px -2px rgba(88,19,234,0.4)',
                  flexShrink: 0,
                }}
              >
                <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: 14 }} />
              </div>
              <div>
                <div style={{ fontFamily: 'DMM', fontSize: 16, fontWeight: 450, color: INK, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Available Sessions
                </div>
               
              </div>
            </div>
            <button
              style={backButtonStyle}
              onClick={() => navigate('/learner/find-tutor')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F3FF')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 8, fontSize: 14 }} />
              Back
            </button>
          </div>

          {/* Body */}
          <div style={mainboxStyle}>
            {loading ? (
              <div style={{ textAlign: 'center' }}>
                <img src={gif} alt="Loading gif" style={gifStyle} />
              </div>
            ) : (
              <>
                {/* ---- tutor profile card ---- */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${LINE}`,
                    borderRadius: 16,
                    padding: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 22,
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      backgroundColor: identityColor,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'DMM',
                      fontWeight: 700,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(tutorName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontFamily: 'DMM', fontSize: 17, fontWeight: 700, color: INK }}>{tutorName}</div>
                    {primaryDomain && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: SUB, fontFamily: 'DMM', fontSize: 12.5, marginTop: 2 }}>
                        <FontAwesomeIcon icon={faUserGraduate} style={{ fontSize: 10.5, color: FAINT }} />
                        {primaryDomain} Expert
                      </div>
                    )}
                    {tutor && tutor.selectedSkills && tutor.selectedSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {tutor.selectedSkills.map((skill, i) => (
                          <span
                            key={skill}
                            style={{
                              backgroundColor: i === 0 ? identityColor : 'transparent',
                              color: i === 0 ? '#FFFFFF' : SUB,
                              border: i === 0 ? 'none' : `1px solid ${LINE}`,
                              borderRadius: 7,
                              fontFamily: 'DMM',
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: i === 0 ? 600 : 500,
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontFamily: 'DMM',
                    fontWeight: 500,
                    color: INK,
                    marginBottom: 15,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: 13, color: VIOLET }} />
                  Available Sessions
                  {slots.length > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 500, color: FAINT }}>
                      ({slots.length} {slots.length === 1 ? 'slot' : 'slots'})
                    </span>
                  )}
                </div>

                {slots.length === 0 ? (
                  <div style={{ textAlign: 'center', fontFamily: 'DMM', padding: '48px 20px' }}>
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        margin: '0 auto 14px',
                        borderRadius: 14,
                        backgroundColor: 'rgba(88,19,234,0.08)',
                        color: VIOLET,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                      }}
                    >
                      <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 14.5, marginBottom: 4 }}>No slots available</div>
                    <div style={{ fontSize: 13, color: SUB }}>Please check back later.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {slots.map((slot) => {
                      const { day, month } = dateParts(slot.date);
                      return (
                        <div
                          key={slot.slotId}
                          style={{
                            display: 'flex',
                            flexDirection: isMobileView ? 'column' : 'row',
                            borderRadius: 16,
                            backgroundColor: '#FFFFFF',
                            border: `1px solid ${LINE}`,
                            overflow: 'hidden',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 12px 26px -14px rgba(23,16,46,0.18)';
                            e.currentTarget.style.borderColor = 'rgba(88,19,234,0.20)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = LINE;
                          }}
                        >
                          {/* date stub — boarding-pass style */}
                          <div
                            style={{
                              flexShrink: 0,
                              width: isMobileView ? '100%' : 84,
                              backgroundColor: 'rgba(88,19,234,0.07)',
                              display: 'flex',
                              flexDirection: isMobileView ? 'row' : 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: isMobileView ? 10 : 0,
                              padding: isMobileView ? '10px 16px' : '16px 8px',
                            }}
                          >
                            <div
                              style={{
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                fontSize: 22,
                                fontWeight: 700,
                                color: VIOLET,
                                lineHeight: 1,
                              }}
                            >
                              {day}
                            </div>
                            <div
                              style={{
                                fontFamily: 'DMM',
                                fontSize: 11,
                                fontWeight: 700,
                                color: VIOLET,
                                letterSpacing: '0.1em',
                                marginTop: isMobileView ? 0 : 4,
                              }}
                            >
                              {month}
                            </div>
                          </div>

                          {/* perforated divider */}
                          <div
                            style={{
                              width: isMobileView ? '100%' : 0,
                              borderLeft: isMobileView ? 'none' : `1px dashed ${LINE}`,
                              borderTop: isMobileView ? `1px dashed ${LINE}` : 'none',
                              flexShrink: 0,
                            }}
                          />

                          {/* content */}
                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: isMobileView ? 'column' : 'row',
                              alignItems: isMobileView ? 'flex-start' : 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              padding: 16,
                            }}
                          >
                            <div>
                              <div style={{ fontFamily: 'DMM', fontSize: 14.5, fontWeight: 600, color: INK }}>
                                {formatDateShort(slot.date)}
                              </div>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: SUB,
                                  marginTop: 5,
                                }}
                              >
                                <FontAwesomeIcon icon={faClock} style={{ fontSize: 10, color: FAINT }} />
                                {to12Hour(slot.startTime)} – {to12Hour(slot.endTime)}
                              </div>
                            </div>
                            <button style={bookButtonStyle} onClick={() => setBookingSlot(slot)}>
                              Book
                              <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: 8, fontSize: 11 }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {bookingSlot && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: INK }}>Confirm Booking</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: `1px solid ${LINE}`,
                  fontSize: 13.5,
                }}
              >
                <span style={{ color: SUB }}>Tutor</span>
                <span style={{ color: INK, fontWeight: 600 }}>{tutorName}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: `1px solid ${LINE}`,
                  fontSize: 13.5,
                }}
              >
                <span style={{ color: SUB }}>Domain</span>
                <span style={{ color: INK, fontWeight: 600 }}>
                  {requestedDomain && requestedDomain !== 'All' ? requestedDomain : primaryDomain}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: `1px solid ${LINE}`,
                  fontSize: 13.5,
                }}
              >
                <span style={{ color: SUB }}>Date</span>
                <span style={{ color: INK, fontWeight: 600 }}>{formatDate(bookingSlot.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', fontSize: 13.5 }}>
                <span style={{ color: SUB }}>Time</span>
                <span style={{ color: INK, fontWeight: 600 }}>
                  {to12Hour(bookingSlot.startTime)} - {to12Hour(bookingSlot.endTime)}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  color: '#DC2626',
                  fontSize: 12.5,
                  marginTop: 12,
                  backgroundColor: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                style={backButtonStyle}
                onClick={() => {
                  setBookingSlot(null);
                  setErrorMessage('');
                }}
              >
                Cancel
              </button>
              <button style={bookButtonStyle} onClick={handleConfirmBooking}>
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorAvailability;