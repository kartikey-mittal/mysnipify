import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet } from '@fortawesome/free-solid-svg-icons';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { db } from '../Firebase';

const appID = 403487016;
const serverSecret = '41601739f52161096bb4cb8765db75e3';
const FREE_SECONDS = 10 * 60;
const BLOCK_SECONDS = 30 * 60;
const BLOCK_COST = 50;
const GRACE_SECONDS = 5 * 60;

const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const Room1 = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const meetingRef = useRef(null);
    const bookingIdRef = useRef(null);
    const learnerIdRef = useRef(null);
    const chargedBlocksRef = useRef(0);

    const [startedAt, setStartedAt] = useState(null);
    const [balance, setBalance] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [warning, setWarning] = useState(false);
    const [graceEnd, setGraceEnd] = useState(0);

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
                    chargedBlocksRef.current = booking.chargedBlocks || 0;

                    if (booking.sessionStartedAt) {
                        setStartedAt(booking.sessionStartedAt);
                    } else {
                        const startTime = Date.now();
                        setStartedAt(startTime);
                        await updateDoc(doc(db, 'Bookings', bookingDoc.id), { status: 'ongoing', sessionStartedAt: startTime });
                    }
                } else {
                    setStartedAt(Date.now());
                }
            } catch (error) {
                console.log('Booking error:', error);
                setStartedAt(Date.now());
            }
        };

        const loadLearner = async () => {
            try {
                const email = localStorage.getItem('LearnerEmail') || '';
                const snapshot = await getDocs(query(collection(db, 'Learner'), where('Email', '==', email)));

                if (!snapshot.empty) {
                    const learnerDoc = snapshot.docs[0];
                    const learner = learnerDoc.data();
                    learnerIdRef.current = learnerDoc.id;
                    setBalance(learner.creditBalance ?? 500);
                }
            } catch (error) {
                console.log('Learner error:', error);
            }
        };

        loadBooking();
        loadLearner();

        const userName = localStorage.getItem('LearnerName') || 'Learner';
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
                        await updateDoc(doc(db, 'Bookings', bookingIdRef.current), { status: 'completed', sessionEndedAt: Date.now() });
                    } catch (error) {
                        console.log('Error completing booking:', error);
                    }
                }
                navigate('/learner/home');
            }
        });

        return () => {
            if (zegoMeeting) zegoMeeting.destroy();
        };
    }, [roomId, navigate]);

    const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
    const isFreeTime = elapsedSeconds < FREE_SECONDS;
    const freeSecondsLeft = FREE_SECONDS - elapsedSeconds;
    const paidSeconds = Math.max(0, elapsedSeconds - FREE_SECONDS);
    const currentBlock = Math.floor(paidSeconds / BLOCK_SECONDS);
    const blockSecondsLeft = BLOCK_SECONDS - (paidSeconds % BLOCK_SECONDS);

    useEffect(() => {
        if (startedAt === null || isFreeTime || balance < BLOCK_COST) return;

        const blocksToCharge = currentBlock + 1;
        if (blocksToCharge <= chargedBlocksRef.current) return;

        chargedBlocksRef.current = blocksToCharge;
        const newBalance = balance - BLOCK_COST;

        const chargeLearner = async () => {
            if (!learnerIdRef.current) return;

            try {
                await updateDoc(doc(db, 'Learner', learnerIdRef.current), { creditBalance: newBalance });
                setBalance(newBalance);
            } catch (error) {
                console.log('Error charging credits:', error);
            }
        };

        const saveBooking = async () => {
            if (!bookingIdRef.current) return;

            try {
                await updateDoc(doc(db, 'Bookings', bookingIdRef.current), { chargedBlocks: blocksToCharge });
            } catch (error) {
                console.log('Error saving charged block:', error);
            }
        };

        chargeLearner();
        saveBooking();
    }, [currentBlock, isFreeTime, startedAt, balance]);

    useEffect(() => {
        if (startedAt === null || isFreeTime || warning) return;

        if (balance < BLOCK_COST) {
            setWarning(true);
            setGraceEnd(Date.now() + GRACE_SECONDS * 1000);
        }
    }, [startedAt, isFreeTime, balance, warning]);

    const endSession = useCallback(async () => {
    if (bookingIdRef.current) {
        try {
            await updateDoc(
                doc(db, 'Bookings', bookingIdRef.current),
                {
                    status: 'completed',
                    sessionEndedAt: Date.now()
                }
            );
        } catch (error) {
            console.log('Error ending session:', error);
        }
    }

    navigate('/learner/home');
}, [navigate]);

   useEffect(() => {
    if (warning && now >= graceEnd) endSession();
}, [warning, now, graceEnd, endSession]);

    const graceSecondsLeft = Math.max(0, Math.ceil((graceEnd - now) / 1000));
    const showWarning = warning && !isFreeTime && balance < BLOCK_COST;

    return (
        <>
            <style>{`
                @keyframes liveBlink {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.25; transform: scale(0.75); }
                }
            `}</style>

            <div style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#0F0F1A' }}>
                <div style={topBarStyle}>
    <div style={brandBoxStyle}>
        <div style={{ fontSize: 20, fontWeight: 450, letterSpacing: '-0.5px', lineHeight: 1 }}>Snipify</div>
       
    </div>

    <div style={liveBoxStyle}>
        <span style={liveDotStyle}></span>
        <span>LIVE</span>
    </div>

    <div style={creditStyle}>
        <FontAwesomeIcon icon={faWallet} style={{ color: '#2563EB', fontSize: 17 }} />
        <span style={{ color: '#172554', fontSize: 17, fontWeight: 800 }}>₹{balance}</span>
    </div>
</div>

                <div style={timerBarStyle}>
                    {isFreeTime ? (
                        <>
                            <div style={{ fontSize: 13, color: '#6EE7A8', fontWeight: 600 }}>FREE TIME</div>
                            <div style={{ ...timerTextStyle, color: '#6EE7A8', textShadow: '0 0 14px rgba(110,231,168,0.7)' }}>
                                {formatTime(freeSecondsLeft)}
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.85 }}>left out of 10 minutes</div>
                        </>
                    ) : showWarning ? (
                        <>
                            <div style={{ fontSize: 13, color: '#FF6B6B', fontWeight: 600 }}>OUT OF CREDIT</div>
                            <div style={{ ...timerTextStyle, color: '#FF6B6B', textShadow: '0 0 14px rgba(255,107,107,0.7)' }}>
                                {formatTime(graceSecondsLeft)}
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.85 }}>max time left, session ends after this</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 13, color: '#FFD166', fontWeight: 600 }}>PAID BLOCK {currentBlock + 1} · ₹{BLOCK_COST} charged</div>
                            <div style={{ ...timerTextStyle, color: '#FFD166', textShadow: '0 0 14px rgba(255,209,102,0.7)' }}>
                                {formatTime(blockSecondsLeft)}
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.85 }}>session time: {formatTime(elapsedSeconds)}</div>
                        </>
                    )}
                </div>

                <div ref={meetingRef} style={{ width: '100%', height: '100%' }} />

                {showWarning && (
                    <div style={modalOverlayStyle}>
                        <div style={modalStyle}>
                            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Out of Credit!</div>
                            <div style={{ color: '#7D716A', marginBottom: 8 }}>Your free 10 minutes are over and you don't have enough credits.</div>
                            <div style={{ color: '#7D716A', marginBottom: 20 }}>
                                Session will run for a maximum of <b>5 more minutes</b>, then you'll be redirected to Home.
                                <br />
                                Add credits and continue the session from My Bookings.
                            </div>
                            <div style={{ marginBottom: 16 }}>Ending in <b>{formatTime(graceSecondsLeft)}</b></div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate('/learner/wallet')} style={{ ...buttonStyle, backgroundColor: '#16A34A' }}>Add Credits</button>
                                <button onClick={endSession} style={buttonStyle}>End Session Now</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const topBarStyle = {
    position: 'absolute', top: 14, left: 18, right: 18, zIndex: 100,
    display: 'flex', alignItems: 'flex-start', gap: 12,
    color: 'white', fontFamily: 'DMM', pointerEvents: 'none'
};

const brandBoxStyle = {
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: '7px 14px 8px', borderRadius: 13,
    background: '#6324ea',
    border: '1px solid rgba(255,255,255,0.13)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
};

const liveBoxStyle = {
    display: 'flex', alignItems: 'center', gap: 7,
    marginTop: 4, padding: '8px 13px',
    backgroundColor: 'white', color: '#EF4444',
    borderRadius: 11, border: '1px solid rgba(239,68,68,0.15)',
    boxShadow: '0 5px 16px rgba(0,0,0,0.22)',
    fontSize: 13, fontWeight: 800, letterSpacing: '0.8px'
};

const liveDotStyle = {
    width: 8, height: 8, borderRadius: '50%',
    backgroundColor: '#EF4444',
    boxShadow: '0 0 9px rgba(239,68,68,0.75)',
    animation: 'liveBlink 1s infinite'
};

const creditStyle = {
    marginLeft: 'auto', marginTop: 4,
    display: 'flex', alignItems: 'center', gap: 9,
    padding: 10,
    backgroundColor: 'white',
    color: '#172554',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 10,
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
};

const timerBarStyle = {
    position: 'absolute', top: 74, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '10px 28px', borderRadius: 16, background: 'rgba(15, 15, 26, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.15)', fontFamily: 'DMM', color: 'white', minWidth: 230
};

const timerTextStyle = { fontSize: 34, fontWeight: 700, lineHeight: 1.15 };

const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 300
};

const modalStyle = {
    backgroundColor: 'white', borderRadius: 16, padding: 30,
    maxWidth: 420, fontFamily: 'DMM', textAlign: 'center'
};

const buttonStyle = {
    backgroundColor: '#5813EA', color: 'white', borderRadius: 100,
    border: 'none', fontFamily: 'DMM', padding: '10px 24px',
    outline: 'none', cursor: 'pointer', fontSize: 15
};

export default Room1;