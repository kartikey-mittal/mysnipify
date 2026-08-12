import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { db } from '../Firebase';

const appID = 403487016;
const serverSecret = '41601739f52161096bb4cb8765db75e3';

const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const Room2 = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const meetingRef = useRef(null);
    const bookingIdRef = useRef(null);

    const [startedAt, setStartedAt] = useState(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadBooking = async () => {
            try {
                const snapshot = await getDocs(query(collection(db, 'Bookings'), where('roomId', '==', roomId)));

                if (!snapshot.empty) {
                    const bookingDoc = snapshot.docs[0];
                    const booking = bookingDoc.data();

                    bookingIdRef.current = bookingDoc.id;

                    if (booking.sessionStartedAt) {
                        setStartedAt(booking.sessionStartedAt);
                    } else {
                        const startTime = Date.now();
                        setStartedAt(startTime);

                        await updateDoc(doc(db, 'Bookings', bookingDoc.id), {
                            status: 'ongoing',
                            sessionStartedAt: startTime
                        });
                    }
                } else {
                    setStartedAt(Date.now());
                }
            } catch (error) {
                console.log('Booking error:', error);
                setStartedAt(Date.now());
            }
        };

        loadBooking();

        const userName = localStorage.getItem('SkilledName') || 'Expert';
        const token = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomId, Date.now().toString(), userName);
        const zegoMeeting = ZegoUIKitPrebuilt.create(token);

        zegoMeeting.joinRoom({
            container: meetingRef.current,
            scenario: { mode: ZegoUIKitPrebuilt.VideoConference },
            showPreJoinView: false,
            turnOnCameraWhenJoining: true,
            turnOnMicrophoneWhenJoining: true,
            onLeaveRoom: async () => {
                if (bookingIdRef.current) {
                    try {
                        await updateDoc(doc(db, 'Bookings', bookingIdRef.current), {
                            status: 'completed',
                            sessionEndedAt: Date.now()
                        });
                    } catch (error) {
                        console.log('Error completing booking:', error);
                    }
                }

                navigate('/skilled/home');
            }
        });

        return () => {
            if (zegoMeeting) zegoMeeting.destroy();
        };
    }, [roomId, navigate]);

    const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#0F0F1A' }}>
            {/* <div style={topBarStyle}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>Snipify Session</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Room: {roomId}</div>
                </div>
            </div> */}

            <div style={timerBarStyle}>
                <div style={{ fontSize: 13, color: '#FFD166', fontWeight: 600 }}>SESSION TIME</div>
                <div style={{ fontSize: 34, fontWeight: 700, color: 'white', textShadow: '0 0 14px rgba(255,209,102,0.5)' }}>
                    {formatTime(elapsed)}
                </div>
            </div>

            <div ref={meetingRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

const topBarStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #5813EA, #7C3AED)',
    color: 'white',
    fontFamily: 'DMM',
};

const timerBarStyle = {
    position: 'absolute',
    top: 74,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '10px 28px',
    borderRadius: 16,
    background: 'rgba(15, 15, 26, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    fontFamily: 'DMM',
    color: 'white',
    minWidth: 200,
};

export default Room2;