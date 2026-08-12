import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faPlus,
  faTrash,
  faCheckCircle,
  faSpinner,
  faCircleInfo,
  faArrowLeft,
  faXmark,
  faCalendarDay,
} from '@fortawesome/free-solid-svg-icons';
import Navbar from '../Navbar';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../Firebase';
import { useNavigate } from 'react-router-dom';
import { getSkilledId } from '../utils/identity';
import { to12Hour, formatDateShort } from '../utils/format';
import '../skilled/manageCalendar.css';

/* =========================================================================
   DESIGN TOKENS
   Palette: near-white canvas, ink-slate text, indigo/violet brand, warm
   amber for "booked". Everything derives from this token set.
   ========================================================================= */
const TOKENS = {
  ink: '#0F172A',
  sub: '#64748B',
  faint: '#94A3B8',
  line: 'rgba(15, 23, 42, 0.07)',
  lineStrong: 'rgba(15, 23, 42, 0.12)',

  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FC',
  surfaceSunken: '#F1F2F8',

  brand: '#5813EA',
  brand2: '#7C4DFF',
  brandSoft: 'rgba(88, 19, 234, 0.08)',
  brandLine: 'rgba(88, 19, 234, 0.20)',

  booked: '#EA580C',
  bookedSoft: 'rgba(234, 88, 12, 0.09)',
  bookedLine: 'rgba(234, 88, 12, 0.24)',

  danger: '#DC2626',
  dangerSoft: 'rgba(220, 38, 38, 0.08)',
  dangerLine: 'rgba(220, 38, 38, 0.20)',

  radiusLg: 22,
  radiusMd: 14,
  radiusSm: 10,

  shadowCard: '0 30px 70px -20px rgba(15, 23, 42, 0.28)',
  shadowFloat: '0 10px 24px -8px rgba(88, 19, 234, 0.38)',
  shadowSoft: '0 1px 2px rgba(15, 23, 42, 0.04)',

  font: "'DMM', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const overlaps = (slot, startM, endM) => {
  const s = toMinutes(slot.startTime);
  const e = toMinutes(slot.endTime);
  return startM < e && s < endM;
};

/* Scoped global CSS — reskins FullCalendar + small keyframes.
   Kept as a single injected stylesheet since FullCalendar renders its own
   DOM structure that inline styles can't reach. */
const GlobalStyle = () => (
  <style>{`
    @keyframes availSpin { to { transform: rotate(360deg); } }
    @keyframes availFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes availPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

    .avail-scope .fc { font-family: ${TOKENS.font}; }
    .avail-scope .fc-scrollgrid { border-radius: 16px; overflow: hidden; border-color: ${TOKENS.line} !important; }
    .avail-scope .fc-theme-standard td, .avail-scope .fc-theme-standard th { border-color: ${TOKENS.line}; }
    .avail-scope .fc-col-header { background: ${TOKENS.surfaceAlt}; }
    .avail-scope .fc-col-header-cell { padding: 11px 0; }
    .avail-scope .fc-col-header-cell-cushion {
      color: ${TOKENS.sub}; font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; text-decoration: none;
    }
    .avail-scope .fc-daygrid-day-frame { padding: 5px; border-radius: 12px; transition: background-color .15s ease; }
    .avail-scope .fc-daygrid-day:hover .fc-daygrid-day-frame { background-color: ${TOKENS.brandSoft}; cursor: pointer; }
    .avail-scope .fc-daygrid-day-top { flex-direction: row; padding: 2px; }
    .avail-scope .fc-daygrid-day-number {
      color: ${TOKENS.ink}; font-size: 12.5px; font-weight: 500; padding: 5px 7px; text-decoration: none;
    }
    .avail-scope .fc-day-today .fc-daygrid-day-frame { background-color: ${TOKENS.brandSoft} !important; }
    .avail-scope .fc-day-today .fc-daygrid-day-number {
      background: linear-gradient(135deg, #6366F1 0%, ${TOKENS.brand} 100%);
      color: #fff; font-weight: 700; border-radius: 8px; padding: 3px 8px;
    }
    .avail-scope .fc-day-other .fc-daygrid-day-number { color: ${TOKENS.faint}; opacity: 0.6; }
    .avail-scope .fc-daygrid-event { border-radius: 8px; border: none; margin-top: 3px; }
    .avail-scope .fc-toolbar-title { font-family: ${TOKENS.font}; font-size: 15.5px; font-weight: 600; color: ${TOKENS.ink}; letter-spacing: -0.01em; }
    .avail-scope .fc-toolbar.fc-header-toolbar { margin-bottom: 16px; }
    .avail-scope .fc-button {
      background: #fff !important; border: 1px solid ${TOKENS.lineStrong} !important; color: #334155 !important;
      box-shadow: none !important; font-family: ${TOKENS.font}; font-size: 12.5px !important;
      padding: 6px 13px !important; border-radius: 10px !important; text-transform: capitalize !important;
      font-weight: 500 !important; transition: all .15s ease !important;
    }
    .avail-scope .fc-button:hover { background: #F5F3FF !important; border-color: ${TOKENS.brandLine} !important; color: ${TOKENS.brand} !important; }
    .avail-scope .fc-button:focus { box-shadow: 0 0 0 3px ${TOKENS.brandSoft} !important; }
    .avail-scope .fc-button-primary:disabled { opacity: 0.4 !important; }
    .avail-scope .fc-daygrid-day-events { margin-top: 1px; }
  `}</style>
);

const ManageAvailability = () => {
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 615);
  const [tutorId, setTutorId] = useState(null);
  const [tutorName, setTutorName] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [modal, setModal] = useState(null);
  const [formDate, setFormDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 615);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      const id = await getSkilledId();
      if (!id) {
        setLoading(false);
        return;
      }
      setTutorId(id);
      setTutorName(localStorage.getItem('SkilledName') || 'Tutor');

      const unsubscribe = onSnapshot(
        query(collection(db, 'TutorAvailability'), where('tutorId', '==', id)),
        (querySnapshot) => {
          const list = [];
          querySnapshot.forEach((doc) => {
            list.push({ slotId: doc.id, ...doc.data() });
          });
          list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
          setSlots(list);
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to slots:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    };
    init();
  }, []);

  const openAddModal = (date) => {
    setFormDate(date || '');
    setStartTime('');
    setEndTime('');
    setFormError('');
    setModal('add');
  };

  const openDeleteModal = (slot) => setModal({ type: 'delete', slot });

  const handleAddSlot = async () => {
    setFormError('');
    if (!formDate || !startTime || !endTime) {
      setFormError('Please fill in date, start time and end time.');
      return;
    }
    const startM = toMinutes(startTime);
    const endM = toMinutes(endTime);
    if (endM <= startM) {
      setFormError('End time must be after start time.');
      return;
    }
    if (endM - startM < 30) {
      setFormError('Slot must be at least 30 minutes long.');
      return;
    }
    const clash = slots.find((slot) => slot.date === formDate && overlaps(slot, startM, endM));
    if (clash) {
      setFormError(
        `Overlaps with your existing slot: ${to12Hour(clash.startTime)} - ${to12Hour(clash.endTime)}.`
      );
      return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, 'TutorAvailability'), {
        tutorId,
        tutorName,
        date: formDate,
        startTime,
        endTime,
        booked: false,
        bookedBy: '',
        bookingId: '',
      });
      setModal(null);
    } catch (error) {
      console.error('Error adding slot:', error);
      setFormError('Failed to add slot. Please try again.');
    }
    setAdding(false);
  };

  const handleDeleteSlot = async () => {
    if (!modal || modal.type !== 'delete') return;
    const { slot } = modal;
    setAdding(true);
    try {
      await deleteDoc(doc(db, 'TutorAvailability', slot.slotId));
      setModal(null);
    } catch (error) {
      console.error('Error deleting slot:', error);
      setFormError('Failed to delete slot. Please try again.');
      setModal({ type: 'delete', slot, error: true });
    }
    setAdding(false);
  };

  const calendarEvents = slots.map((slot) => ({
    id: slot.slotId,
    title: `${to12Hour(slot.startTime)} - ${to12Hour(slot.endTime)}`,
    date: slot.date,
    allDay: true,
    booked: slot.booked,
  }));

  const openPicker = (e) => {
    try {
      // Chrome / Edge / Firefox / Safari 16+ open the native picker on click.
      if (e.currentTarget.showPicker) e.currentTarget.showPicker();
    } catch (err) {
      // Older browsers fall back to default click behavior.
    }
  };

  const handleDateClick = (arg) => {
    if (arg.jsEvent.target.closest('.fc-event')) return;
    openAddModal(arg.dateStr);
  };

  const handleEventClick = (arg) => {
    const slot = slots.find((s) => s.slotId === arg.event.id);
    if (slot && !slot.booked) openDeleteModal(slot);
  };

  const totalSlots = slots.length;
  const bookedCount = slots.filter((s) => s.booked).length;
  const availableCount = totalSlots - bookedCount;
  const skilledName = localStorage.getItem('SkilledName') || 'Tutor';

  /* ---------------- styles ---------------- */
  const homeStyle = {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ff7b6a',
    background: `
      repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(242, 242, 242, 0.8) 50px, rgba(242, 242, 242, 0.8) 51px),
      repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(242, 242, 242, 0.8) 50px, rgba(242, 242, 242, 0.8) 51px),
      #ff7b6a`,
  };

  const contentStyle = {
    width: isMobileView ? '100%' : 'min(1180px, 92%)',
    minHeight: '85vh',
    borderRadius: TOKENS.radiusLg,
    border: `1px solid ${TOKENS.line}`,
    boxShadow: TOKENS.shadowCard,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    overflow: 'hidden',
    backgroundColor: TOKENS.surface,
    textAlign: 'left',
  };

  const headingStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: isMobileView ? '16px 18px' : '18px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${TOKENS.line}`,
    position: 'sticky',
    top: 0,
    zIndex: 5,
  };

  const mainboxStyle = {
    flex: 1,
    width: '100%',
    boxSizing: 'border-box',
    padding: isMobileView ? 18 : '26px 28px 32px',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    animation: 'availFadeUp 0.35s ease both',
  };

  const backButtonStyle = {
    backgroundColor: TOKENS.surface,
    color: TOKENS.brand,
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.brandLine}`,
    fontFamily: TOKENS.font,
    padding: '9px 16px',
    outline: 'none',
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 500,
    boxShadow: TOKENS.shadowSoft,
    transition: 'all 0.18s ease',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  };

  const addSlotBtnStyle = {
    background: 'linear-gradient(135deg, #6366F1 0%, #5813EA 100%)',
    color: 'white',
    borderRadius: TOKENS.radiusSm,
    border: 'none',
    fontFamily: TOKENS.font,
    padding: '11px 20px',
    outline: 'none',
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 450,
    letterSpacing: '0.01em',
    boxShadow: TOKENS.shadowFloat,
    transition: 'all 0.18s ease',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  };

  const modalStyle = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: TOKENS.radiusLg,
      border: `1px solid ${TOKENS.line}`,
      boxShadow: '0 30px 70px -14px rgba(15,23,42,0.30)',
      padding: 26,
      width: isMobileView ? '90%' : 440,
      maxWidth: '92vw',
      fontFamily: TOKENS.font,
      backgroundColor: TOKENS.surface,
    },
    overlay: {
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(5px)',
      zIndex: 1000,
    },
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: TOKENS.radiusSm,
    padding: '11px 13px',
    border: `1px solid ${TOKENS.lineStrong}`,
    backgroundColor: TOKENS.surfaceAlt,
    fontFamily: TOKENS.font,
    fontSize: 14,
    fontWeight: 400,
    color: TOKENS.ink,
    outline: 'none',
    transition: 'all 0.15s ease',
  };

  const focusIn = (e) => {
    e.currentTarget.style.borderColor = TOKENS.brand2;
    e.currentTarget.style.boxShadow = `0 0 0 3.5px ${TOKENS.brandSoft}`;
    e.currentTarget.style.backgroundColor = TOKENS.surface;
  };
  const focusOut = (e) => {
    e.currentTarget.style.borderColor = TOKENS.lineStrong;
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.backgroundColor = TOKENS.surfaceAlt;
  };

  const labelStyle = {
    fontSize: 12,
    color: TOKENS.sub,
    fontWeight: 500,
    display: 'block',
    marginBottom: 7,
    fontFamily: TOKENS.font,
    letterSpacing: '0.01em',
  };

  const ghostBtnStyle = {
    backgroundColor: TOKENS.surface,
    color: TOKENS.sub,
    borderRadius: TOKENS.radiusSm,
    border: `1px solid ${TOKENS.lineStrong}`,
    fontFamily: TOKENS.font,
    padding: '9px 18px',
    outline: 'none',
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 500,
    transition: 'all 0.18s ease',
  };

  const closeIconBtnStyle = {
    width: 30,
    height: 30,
    borderRadius: 9,
    border: 'none',
    backgroundColor: TOKENS.surfaceAlt,
    color: TOKENS.sub,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 12.5,
    flexShrink: 0,
    transition: 'all 0.15s ease',
  };

  /* ---------------- small building blocks ---------------- */
  const IconBadge = ({ icon, size = 38, bg, color, fontSize = 14 }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: bg,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ fontSize }} />
    </div>
  );

  const StatItem = ({ icon, color, value, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px' ,fontFamily:'DMM'}}>
      <FontAwesomeIcon icon={icon} style={{ fontSize: 12.5, color }} />
      <span style={{ fontSize: 13.5, fontWeight: 500, color: TOKENS.ink, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <span style={{ fontSize: 12.5, color: TOKENS.sub, fontWeight: 500 }}>{label}</span>
    </div>
  );

  const ErrorBox = ({ text }) => (
    <div
      style={{
        backgroundColor: TOKENS.dangerSoft,
        border: `1px solid ${TOKENS.dangerLine}`,
        color: TOKENS.danger,
        borderRadius: TOKENS.radiusSm,
        padding: '10px 13px',
        fontSize: 12.5,
        fontWeight: 500,
        marginTop: 14,
        fontFamily: TOKENS.font,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  );

  return (
    <>
      <GlobalStyle />
      <Navbar />
      <div style={homeStyle}>
        <div style={contentStyle} className="avail-scope">
          {/* Header */}
          <div style={headingStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <IconBadge
                icon={faCalendarAlt}
                bg="linear-gradient(135deg, #6366F1 0%, #5813EA 100%)"
                color="#fff"
                fontSize={15}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: TOKENS.font,
                    fontSize: 17,
                    fontWeight: 500,
                    color: TOKENS.ink,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  Manage Availability
                </div>
                <div style={{ fontFamily: TOKENS.font, fontSize: 12.5, fontWeight: 400, color: TOKENS.sub, marginTop: 2 }}>
                  Control when learners can book you, {skilledName}
                </div>
              </div>
            </div>
            <button
              style={backButtonStyle}
              onClick={() => navigate('/skilled/home')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F5F3FF';
                e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(88,19,234,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = TOKENS.surface;
                e.currentTarget.style.boxShadow = TOKENS.shadowSoft;
              }}
            >
              <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 8, fontSize: 12 }} />
              {!isMobileView && 'Back'}
            </button>
          </div>

          {/* Body */}
          <div style={mainboxStyle}>
            {/* toolbar */}
            <div
              style={{
                display: 'flex',
                flexDirection: isMobileView ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobileView ? 'stretch' : 'center',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <button
                onClick={() => openAddModal('')}
                style={addSlotBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: 9, fontSize: 12 }} />
                Add Slot
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: TOKENS.surfaceAlt,
                  border: `1px solid ${TOKENS.line}`,
                  borderRadius: TOKENS.radiusSm,
                  overflow: 'hidden',
                  flexWrap: 'wrap',
                }}
              >
                <StatItem icon={faCheckCircle} color={TOKENS.brand} value={availableCount} label="Available" />
                <div style={{ width: 1, alignSelf: 'stretch', backgroundColor: TOKENS.line }} />
                <StatItem icon={faClock} color={TOKENS.booked} value={bookedCount} label="Booked" />
                <div style={{ width: 1, alignSelf: 'stretch', backgroundColor: TOKENS.line }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px' }}>
                  <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: 12, color: TOKENS.faint }} />
                  <span style={{ fontSize: 12, color: TOKENS.faint, fontWeight: 500 ,fontFamily:"DMM"}}>Click a day to add</span>
                </div>
              </div>
            </div>

            {/* empty state hint */}
            {!loading && totalSlots === 0 && (
              <div
                style={{
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: TOKENS.brandSoft,
                  border: `1px solid ${TOKENS.brandLine}`,
                  borderRadius: TOKENS.radiusSm,
                  padding: '13px 16px',
                }}
              >
                <IconBadge icon={faCalendarDay} size={32} bg="rgba(88,19,234,0.14)" color={TOKENS.brand} fontSize={13} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: TOKENS.ink }}>No availability yet</div>
                  <div style={{ fontSize: 12.5, color: TOKENS.sub, marginTop: 1 }}>
                    Click any day on the calendar below to open your first slot for booking.
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '90px 0',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: `3px solid ${TOKENS.line}`,
                    borderTopColor: TOKENS.brand,
                    animation: 'availSpin 0.8s linear infinite',
                  }}
                />
                <div style={{ fontSize: 13, color: TOKENS.sub, fontWeight: 500, animation: 'availPulse 1.6s ease-in-out infinite' }}>
                  Loading your availability…
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  maxWidth: 1080,
                  margin: '20px auto 0',
                  backgroundColor: TOKENS.surface,
                  border: `1px solid ${TOKENS.line}`,
                  borderRadius: 18,
                  padding: isMobileView ? 12 : 18,
                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                }}
              >
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  height="auto"
                  dayMaxEvents={3}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: '',
                  }}
                  buttonText={{ today: 'Today' }}
                  events={calendarEvents}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  eventContent={(arg) => {
                    const booked = arg.event.extendedProps.booked;
                    return (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: booked ? TOKENS.bookedSoft : TOKENS.brandSoft,
                          border: `1px solid ${booked ? TOKENS.bookedLine : TOKENS.brandLine}`,
                          color: booked ? TOKENS.booked : TOKENS.brand,
                          borderRadius: 8,
                          padding: '3.5px 8px',
                          fontSize: 11,
                          fontWeight: 500,
                          fontFamily: TOKENS.font,
                          fontVariantNumeric: 'tabular-nums',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            backgroundColor: booked ? TOKENS.booked : TOKENS.brand,
                            flexShrink: 0,
                          }}
                        />
                        {booked ? 'Booked' : arg.event.title}
                      </div>
                    );
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Add modal ---------- */}
      <Modal isOpen={modal === 'add'} onRequestClose={() => setModal(null)} style={modalStyle} ariaHideApp={false}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconBadge icon={faPlus} bg={TOKENS.brandSoft} color={TOKENS.brand} fontSize={14} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: TOKENS.ink, letterSpacing: '-0.01em' }}>
                Add New Slot
              </div>
              <div style={{ fontSize: 12.5, color: TOKENS.sub, marginTop: 1 }}>
                Learners can book this time once saved
              </div>
            </div>
          </div>
          <button
            style={closeIconBtnStyle}
            onClick={() => setModal(null)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surfaceSunken)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surfaceAlt)}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div style={{ marginTop: 22, textAlign: 'left' }}>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={focusIn}
            onBlur={focusOut}
            onClick={openPicker}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14, textAlign: 'left' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={focusIn}
              onBlur={focusOut}
              onClick={openPicker}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={focusIn}
              onBlur={focusOut}
              onClick={openPicker}
            />
          </div>
        </div>

        {formError && <ErrorBox text={formError} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 26 }}>
          <button
            onClick={() => setModal(null)}
            style={ghostBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surfaceAlt)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surface)}
          >
            Cancel
          </button>
          <button
            onClick={handleAddSlot}
            disabled={adding}
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #5813EA 100%)',
              color: 'white',
              borderRadius: TOKENS.radiusSm,
              border: 'none',
              fontFamily: TOKENS.font,
              padding: '9px 22px',
              outline: 'none',
              cursor: adding ? 'default' : 'pointer',
              fontSize: 13.5,
              fontWeight: 600,
              boxShadow: TOKENS.shadowFloat,
              opacity: adding ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {adding ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                Saving...
              </>
            ) : (
              'Add Slot'
            )}
          </button>
        </div>
      </Modal>

      {/* ---------- Delete modal ---------- */}
      <Modal isOpen={!!(modal && modal.type === 'delete')} onRequestClose={() => setModal(null)} style={modalStyle} ariaHideApp={false}>
        {modal && modal.type === 'delete' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <IconBadge icon={faTrash} bg={TOKENS.dangerSoft} color={TOKENS.danger} fontSize={14} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: TOKENS.ink, letterSpacing: '-0.01em' }}>
                    Delete Slot?
                  </div>
                  <div style={{ fontSize: 12.5, color: TOKENS.sub, marginTop: 1 }}>
                    This action cannot be undone
                  </div>
                </div>
              </div>
              <button
                style={closeIconBtnStyle}
                onClick={() => setModal(null)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surfaceSunken)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surfaceAlt)}
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: TOKENS.surfaceAlt,
                border: `1px solid ${TOKENS.line}`,
                borderRadius: TOKENS.radiusSm,
                padding: '13px 15px',
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                marginTop: 20,
                lineHeight: 1.6,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDateShort(modal.slot.date)} • {to12Hour(modal.slot.startTime)} – {to12Hour(modal.slot.endTime)}
              <br />
              <span style={{ color: TOKENS.sub, fontWeight: 400 }}>
                Learners will no longer be able to book this slot.
              </span>
            </div>

            {formError && <ErrorBox text={formError} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 26 }}>
              <button
                onClick={() => setModal(null)}
                style={ghostBtnStyle}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surfaceAlt)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TOKENS.surface)}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSlot}
                disabled={adding}
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: 'white',
                  borderRadius: TOKENS.radiusSm,
                  border: 'none',
                  fontFamily: TOKENS.font,
                  padding: '9px 22px',
                  outline: 'none',
                  cursor: adding ? 'default' : 'pointer',
                  fontSize: 13.5,
                  fontWeight: 600,
                  boxShadow: '0 10px 24px -8px rgba(220,38,38,0.45)',
                  opacity: adding ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {adding ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />
                    Deleting...
                  </>
                ) : (
                  'Delete Slot'
                )}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default ManageAvailability;