import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faUserGraduate,
  faVideo,
  faCheckCircle,
  faArrowRight,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import Navbar from '../Navbar';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../Firebase';
import { useNavigate } from 'react-router-dom';
import { getSkilledId } from '../utils/identity';
import { todayString, to12Hour, formatDateShort, formatDuration } from '../utils/format';
import { getInitials, getAvatarColor } from '../utils/avatar';
import gif from '../assets/connection.gif';

/* ---------------- Design tokens ---------------- */
const INK = '#1F1410';
const SUB = '#6B5F5A';
const FAINT = '#A79A93';
const LINE = '#F0E6E1';
const PAPER = '#FFF9F7';
const BRAND = '#FF6B54';

const STATUS_META = {
  booked: { label: 'Upcoming', color: '#5813EA', tint: 'rgba(88,19,234,0.08)' },
  ongoing: { label: 'Live now', color: '#DC2626', tint: 'rgba(220,38,38,0.08)' },
  completed: { label: 'Completed', color: '#0F9D78', tint: 'rgba(15,157,120,0.08)' },
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const dateParts = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return { day: '--', month: '---' };
  return { day: String(d.getDate()).padStart(2, '0'), month: MONTHS[d.getMonth()] };
};

const BookedSessions = () => {
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 615);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 615);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      const tutorId = await getSkilledId();
      if (!tutorId) {
        setLoading(false);
        return;
      }

      const unsubscribe = onSnapshot(
        query(collection(db, 'Bookings'), where('tutorId', '==', tutorId)),
        (querySnapshot) => {
          const list = [];
          querySnapshot.forEach((doc) => {
            list.push({ bookingId: doc.id, ...doc.data() });
          });
          list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
          setBookings(list);
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to bookings:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    };
    init();
  }, []);

  const skilledName = localStorage.getItem('SkilledName') || 'Tutor';
  const upcoming = bookings.filter((b) => b.status !== 'completed');
  const past = bookings.filter((b) => b.status === 'completed');

  /* ---------------- Layout shells ---------------- */
  const homeStyle = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
    background: `
      repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(242,242,242,0.5) 50px, rgba(242,242,242,0.5) 51px),
      repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(242,242,242,0.5) 50px, rgba(242,242,242,0.5) 51px),
      #ff7b6a`,
  };

  const contentStyle = {
    width: isMobileView ? '100%' : '85%',
    minHeight: '85vh',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.3)',
    boxShadow: '0 24px 60px -12px rgba(0,0,0,0.30)',
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
    padding: isMobileView ? 14 : '18px 20px 22px',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  };

  const backButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    color: BRAND,
    borderRadius: 10,
    border: `1px solid rgba(255,107,84,0.28)`,
    fontFamily: 'DMM',
    padding: '8px 14px',
    outline: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  };

  const segmentedControlStyle = {
    display: 'inline-flex',
    backgroundColor: '#FFFFFF',
    border: `1px solid ${LINE}`,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    width: 'fit-content',
    marginBottom: 18,
  };

  const segmentStyle = (active) => ({
    fontFamily: 'DMM',
    fontSize: 15,
    fontWeight: active ? 700 : 500,
    color: active ? '#FFFFFF' : SUB,
    backgroundColor: active ? INK : 'transparent',
    borderRadius: 11,
    border: 'none',
    outline: 'none',
    padding: '10px 22px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const gifStyle = { marginTop: 50, width: '40%', height: '40%', objectFit: 'cover' };

  /* ---------------- Boarding-pass session card ---------------- */
  const SessionCard = ({ booking }) => {
    const status = STATUS_META[booking.status] || STATUS_META.booked;
    const duration =
      booking.sessionStartedAt && booking.sessionEndedAt
        ? formatDuration((booking.sessionEndedAt - booking.sessionStartedAt) / 1000)
        : '';
    const learnerName = booking.learnerName || 'Learner';
    const avatarColor = getAvatarColor(learnerName);
    const [hover, setHover] = useState(false);
    const { day, month } = dateParts(booking.date);

    const isCompleted = booking.status === 'completed';
    const showStart = !isCompleted && booking.date === todayString();

    return (
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: isMobileView ? 'column' : 'row',
          borderRadius: 18,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${hover ? 'rgba(255,107,84,0.25)' : LINE}`,
          boxShadow: hover ? '0 16px 34px -16px rgba(31,20,16,0.20)' : '0 1px 2px rgba(15,23,42,0.04)',
          transform: hover ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}
      >
        {/* ---- date stub (boarding-pass style) ---- */}
        <div
          style={{
            position: 'relative',
            flexShrink: 0,
            width: isMobileView ? '100%' : 84,
            backgroundColor: status.tint,
            display: 'flex',
            flexDirection: isMobileView ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobileView ? 10 : 0,
            padding: isMobileView ? '10px 16px' : '18px 8px',
          }}
        >
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 24,
              fontWeight: 700,
              color: status.color,
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
              color: status.color,
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
            height: isMobileView ? 0 : 'auto',
            borderLeft: isMobileView ? 'none' : `1px dashed ${LINE}`,
            borderTop: isMobileView ? `1px dashed ${LINE}` : 'none',
            flexShrink: 0,
          }}
        />

        {/* ---- content ---- */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: isMobileView ? 16 : 18,
            display: 'flex',
            flexDirection: isMobileView ? 'column' : 'row',
            gap: 14,
            alignItems: isMobileView ? 'stretch' : 'center',
          }}
        >
          {/* identity + meta */}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: avatarColor,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'DMM',
                  fontWeight: 600,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {getInitials(learnerName)}
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div
                  style={{
                    fontFamily: 'DMM',
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: INK,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {learnerName}
                </div>
                <div
                  style={{
                    fontFamily: 'DMM',
                    fontSize: 11.5,
                    color: SUB,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    textAlign: 'left',
                  }}
                >
                  <FontAwesomeIcon icon={faUserGraduate} style={{ fontSize: 9.5, color: FAINT }} />
                  Learner
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12.5,
                fontWeight: 600,
                color: INK,
                backgroundColor: PAPER,
                border: `1px solid ${LINE}`,
                borderRadius: 8,
                padding: '5px 10px',
              }}
            >
              <FontAwesomeIcon icon={faClock} style={{ fontSize: 10, color: FAINT }} />
              {to12Hour(booking.startTime)} – {to12Hour(booking.endTime)}
              <span style={{ color: FAINT, fontWeight: 400 }}>· {formatDateShort(booking.date)}</span>
            </div>

            {isCompleted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 11, color: '#0F9D78' }} />
                <span style={{ color: SUB, fontFamily: 'DMM', fontSize: 12 }}>
                  {duration ? `Session lasted ${duration}` : 'Session completed'}
                </span>
              </div>
            )}
          </div>

          {/* status + action rail */}
          <div
            style={{
              display: 'flex',
              flexDirection: isMobileView ? 'row' : 'column',
              alignItems: isMobileView ? 'center' : 'flex-end',
              justifyContent: isMobileView ? 'space-between' : 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: status.tint,
                color: status.color,
                borderRadius: 999,
                padding: '4px 11px',
                fontSize: 11,
                fontFamily: 'DMM',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: status.color,
                  animation: booking.status === 'ongoing' ? 'pulseDot 1.6s infinite' : 'none',
                }}
              />
              {status.label}
            </span>

            {showStart && (
              <button
                onClick={() => navigate(`/room-expert/${booking.roomId}`)}
                style={{
                  backgroundColor: '#0F9D78',
                  color: 'white',
                  borderRadius: 10,
                  border: 'none',
                  fontFamily: 'DMM',
                  padding: '9px 16px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: '0 6px 14px -6px rgba(15,157,120,0.5)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0C7F62')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F9D78')}
              >
                <FontAwesomeIcon
                  icon={booking.status === 'ongoing' ? faArrowRight : faVideo}
                  style={{ marginRight: 8 }}
                />
                {booking.status === 'ongoing' ? 'Continue' : 'Start Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ---------------- Empty state ---------------- */
  const renderList = (list, emptyText) => {
    if (list.length === 0) {
      return (
        <div style={{ textAlign: 'center', fontFamily: 'DMM', padding: '48px 20px' }}>
          <div
            style={{
              width: 50,
              height: 50,
              margin: '0 auto 14px',
              borderRadius: 14,
              backgroundColor: 'rgba(255,107,84,0.10)',
              color: BRAND,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <div style={{ fontWeight: 600, color: '#334155', fontSize: 18.5, marginBottom: 4 }}>No sessions here</div>
          <div style={{ fontSize: 15, fontWeight: 400, color: SUB }}>{emptyText}</div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((booking) => (
          <SessionCard key={booking.bookingId} booking={booking} />
        ))}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes pulseDot {
          0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45); }
          70% { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
      `}</style>
      <Navbar />
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
                  backgroundColor: BRAND,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px -2px rgba(255,107,84,0.4)',
                  flexShrink: 0,
                }}
              >
                <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: 14 }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'DMM', fontSize: 17, fontWeight: 450, color: INK, letterSpacing: '-0.02em', lineHeight: 1.2, textAlign: 'left' }}>
                  Booked Sessions
                </div>
                <div style={{ fontFamily: 'DMM', fontSize: 12, fontWeight: 400, color: SUB, marginTop: 1, textAlign: 'left' }}>
                  Welcome back, {skilledName}
                </div>
              </div>
            </div>
            <button
              style={backButtonStyle}
              onClick={() => navigate('/skilled/home')}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF1EE')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 8, fontSize: 11 }} />
              Back
            </button>
          </div>

          {/* Body */}
          <div style={mainboxStyle}>
            <div style={segmentedControlStyle}>
              <button style={segmentStyle(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
                Upcoming Sessions
              </button>
              <button style={segmentStyle(tab === 'past')} onClick={() => setTab('past')}>
                Past Sessions
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center' }}>
                <img src={gif} alt="Loading gif" style={gifStyle} />
              </div>
            ) : tab === 'upcoming' ? (
              renderList(upcoming, 'No upcoming sessions.')
            ) : (
              renderList(past, 'No past sessions yet.')
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BookedSessions;