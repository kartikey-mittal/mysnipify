import React, { useState, useEffect, useRef } from 'react';
import Navbar1 from "../Navbar1";
import { collection, getDocs, getDoc, query, where, addDoc, doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../Firebase';
import { createTopup, verifyTopup } from '../utils/topup';
import { FaWallet, FaArrowRight, FaCheckCircle, FaTimesCircle, FaClock, FaShieldAlt } from 'react-icons/fa';

const TOPUP_OPTIONS = [100, 200, 500, 1000];

const Wallet = () => {
    const [balance, setBalance] = useState(0), [amountINR, setAmountINR] = useState(100);
    const [topups, setTopups] = useState([]), [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false), [paying, setPaying] = useState(null);
    const [pollStatus, setPollStatus] = useState(''), [error, setError] = useState('');
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 780);
    const pollRef = useRef(null);

    const learnerName = localStorage.getItem('LearnerName') || 'Learner';
    const learnerEmail = localStorage.getItem('LearnerEmail') || '';

    useEffect(() => {
        const resize = () => setIsMobileView(window.innerWidth <= 780);
        window.addEventListener('resize', resize);
        loadData();
        return () => {
            window.removeEventListener('resize', resize);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const markSucceeded = async (topupId, credits) => {
        if (!topupId) return;
        try {
            const ref = doc(db, 'Topups', topupId), snapshot = await getDoc(ref);
            if (!snapshot.exists() || snapshot.data().status !== 'pending') return;

            await updateDoc(ref, { status: 'succeeded', paidAt: serverTimestamp() });

            const learner = await getDocs(query(collection(db, 'Learner'), where('Email', '==', learnerEmail)));
            if (!learner.empty) await updateDoc(doc(db, 'Learner', learner.docs[0].id), { creditBalance: increment(credits) });
        } catch (error) {
            console.log('Error adding credits:', error);
        }
    };

    const markFailed = async (topupId, status) => {
        if (!topupId) return;
        try {
            const ref = doc(db, 'Topups', topupId), snapshot = await getDoc(ref);
            if (!snapshot.exists() || snapshot.data().status !== 'pending') return;
            await updateDoc(ref, { status });
        } catch (error) {
            console.log('Error updating payment:', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            if (learnerEmail) {
                const learner = await getDocs(query(collection(db, 'Learner'), where('Email', '==', learnerEmail)));

                if (!learner.empty) {
                    const data = learner.docs[0].data();
                    setBalance(data.creditBalance === undefined || data.creditBalance === null ? 500 : data.creditBalance);
                }

                const snapshot = await getDocs(query(collection(db, 'Topups'), where('learnerEmail', '==', learnerEmail)));
                const list = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));

                list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                for (const topup of list) {
                    if (topup.status !== 'pending' || !topup.dodoSessionId) continue;

                    try {
                        const response = await verifyTopup({ sessionId: topup.dodoSessionId });
                        const status = response.data.status;

                        if (status === 'succeeded') {
                            await markSucceeded(topup.id, topup.credits);
                            topup.status = 'succeeded';
                        }

                        if (status === 'failed' || status === 'cancelled') {
                            await markFailed(topup.id, status);
                            topup.status = status;
                        }
                    } catch (error) {
                        console.log('Auto payment check error:', error);
                    }
                }

                setTopups(list);
            }
        } catch (error) {
            console.log('Error loading wallet:', error);
        }
        setLoading(false);
    };

    const startPolling = (sessionId, topupId, credits) => {
        if (pollRef.current) clearInterval(pollRef.current);
        let attempts = 0;

        pollRef.current = setInterval(async () => {
            attempts++;
            try {
                const response = await verifyTopup({ sessionId }), status = response.data.status;

                if (status === 'succeeded') {
                    clearInterval(pollRef.current);
                    await markSucceeded(topupId, credits);
                    setPollStatus('Payment received. Credits added to your balance.');
                    setPaying(null);
                    loadData();
                }

                if (status === 'failed' || status === 'cancelled') {
                    clearInterval(pollRef.current);
                    await markFailed(topupId, status);
                    setPollStatus('Payment ' + status + '. No credits were added.');
                    setPaying(null);
                }

                if (!['succeeded', 'failed', 'cancelled'].includes(status)) {
                    setPollStatus('Waiting for payment to be confirmed...');
                }
            } catch (error) {
                console.log('Payment check error:', error);
            }

            if (attempts > 200) {
                clearInterval(pollRef.current);
                setPollStatus('Not confirmed yet. Click "Check Again" once you complete the payment.');
            }
        }, 3000);
    };

    const handlePay = async () => {
        if (!learnerEmail) {
            setError('Please login as a Learner first.');
            return;
        }

        setError('');
        setCreating(true);
        setPollStatus('Creating your payment link...');

        try {
            const response = await createTopup({ learnerEmail, learnerName, amountINR, returnUrl: window.location.origin + '/learner/wallet' });
            const { checkoutUrl, sessionId, credits } = response.data;

            const topup = await addDoc(collection(db, 'Topups'), { learnerEmail, learnerName, amountINR, credits, status: 'pending', dodoSessionId: sessionId, checkoutUrl, createdAt: serverTimestamp() });

            window.open(checkoutUrl, '_blank');
            setPaying({ topupId: topup.id, sessionId, credits });
            setPollStatus('Complete the payment in the opened tab, then wait a few seconds.');
            startPolling(sessionId, topup.id, credits);
        } catch (error) {
            console.log('Payment error:', error);
            setError('Payment service is not reachable. Make sure the Cloudflare Worker is deployed with the Dodo keys.');
            setPollStatus('');
        }

        setCreating(false);
    };

    const handleCheckAgain = async () => {
        if (!paying) return;
        setPollStatus('Checking payment status...');

        try {
            const response = await verifyTopup({ sessionId: paying.sessionId });
            const status = response.data.status;

            if (status === 'succeeded') {
                await markSucceeded(paying.topupId, paying.credits);
                setPollStatus('Payment received. Credits added to your balance.');
                setPaying(null);
                loadData();
                return;
            }

            if (status === 'failed' || status === 'cancelled') {
                await markFailed(paying.topupId, status);
                setPollStatus('Payment ' + status + '. No credits were added.');
                setPaying(null);
                return;
            }

            setPollStatus('Payment is still processing.');
            startPolling(paying.sessionId, paying.topupId, paying.credits);
        } catch (error) {
            console.log('Check payment error:', error);
            setPollStatus('Could not check status right now. Try again in a moment.');
        }
    };

    const statusPill = status => {
        if (status === 'succeeded') return { text: 'Succeeded', color: '#16A34A', icon: <FaCheckCircle /> };
        if (status === 'failed') return { text: 'Failed', color: '#DC2626', icon: <FaTimesCircle /> };
        if (status === 'cancelled') return { text: 'Cancelled', color: '#7D716A', icon: <FaTimesCircle /> };
        return { text: 'Pending', color: '#D97706', icon: <FaClock /> };
    };

    const formatDate = timestamp => {
        if (!timestamp?.seconds) return '—';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <Navbar1 />

            <div style={homeStyle}>
                <div style={contentStyle}>
                    <div style={headingStyle}>
                        <div style={{ marginLeft: 30, margin: 3, display: 'flex', alignItems: 'center' }}>
                            <FaWallet style={{ marginRight: 10, color: '#5813EA' }} /> My Wallet
                        </div>
                    </div>

                    <div style={{ padding: isMobileView ? '20px' : '28px 36px', textAlign: 'left', width: '100%', boxSizing: 'border-box', backgroundColor: '#FAFAFB' }}>

                        <div style={{ display: 'flex', flexDirection: isMobileView ? 'column' : 'row', borderRadius: 18, overflow: 'hidden', border: '1px solid #ECECEF', boxShadow: '0 2px 14px rgba(17,17,26,0.04)' }}>

                            <div style={{ flex: 1, background: 'linear-gradient(155deg, #3b0c9d, #5813ea)', padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                <div style={glowStyle} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                                    <div style={walletIconWrap}><FaWallet style={{ fontSize: 16, color: '#C7B9FF' }} /></div>
                                    <span style={{ fontSize: 12, letterSpacing: '0.6px', color: '#B7A9E8', textTransform: 'uppercase' }}>Credit Balance</span>
                                </div>

                                <div style={{ fontSize: 44, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, marginTop: 10, position: 'relative' }}>₹ {balance}</div>

                                <div style={{ fontSize: 13, color: '#B7A9E8', marginTop: 6, position: 'relative', fontFamily: 'DMM' }}>
                                    1 credit = ₹1 · ₹50 charged per 30 min session
                                </div>
                            </div>

                            <div style={{ flex: 1.2, backgroundColor: 'white', padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderTop: isMobileView ? '1px solid #ECECEF' : 'none' }}>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                    <span style={{ fontSize: 14, color: '#4d5057' }}>Top up credits</span>

                                    <div style={dodoBadge}>
                                        <FaShieldAlt style={{ fontSize: 16 }} /> Dodo Payments
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                                    {TOPUP_OPTIONS.map(option => (
                                        <button
                                            key={option}
                                            onClick={() => setAmountINR(option)}
                                            style={{ ...amountButtonStyle, backgroundColor: amountINR === option ? '#5813EA' : 'white', color: amountINR === option ? 'white' : '#374151', borderColor: amountINR === option ? '#5813EA' : '#E5E7EB' }}
                                        >
                                            <span style={{ fontSize: 16 }}>₹{option}</span>
                                            <span style={{ fontSize: 11, opacity: 0.75 }}>{option} credits</span>
                                        </button>
                                    ))}
                                </div>

                                <button onClick={handlePay} disabled={creating} style={{ ...payButtonStyle, marginTop: 18 }}>
                                    {creating ? 'Creating payment link...' : `Pay ₹${amountINR}`}
                                    <FaArrowRight style={{ marginLeft: 8, fontSize: 12 }} />
                                </button>

                                <div style={testModeRow}>
                                    <FaWallet style={{ fontSize: 15, color: '#7C3AED' }} />
                                    <div>
                                        <div style={{ fontSize: 14 }}>
                                            Use <b>Test</b> Card : <span style={{ fontSize: 15, color: "#059669", letterSpacing: 1 }}>
                                                <b onClick={() => navigator.clipboard.writeText('4576 2389 1277 1450')} style={{ cursor: 'pointer' }}>4576 2389 1277 1450</b>
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: 14, fontSize: 14, color: '#010714' }}>
                                            <span>Date : <span style={{ fontSize: 15, color: '#059669', letterSpacing: 1 }}><b>06/32</b></span></span>
                                            <span>CVV: <span style={{ fontSize: 15, color: '#059669', letterSpacing: 1 }}><b>123</b></span></span>
                                        </div>
                                    </div>
                                </div>

                                {error && <div style={{ color: '#DC2626', marginTop: 12, fontSize: 13 }}>{error}</div>}
                                {pollStatus && <div style={{ color: '#5813EA', marginTop: 12, fontSize: 13 }}>{pollStatus}</div>}

                                {paying && (
                                    <button onClick={handleCheckAgain} style={checkAgainStyle}>
                                        I have paid — check again
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={historyHeaderRow}>
                            <span style={{ fontSize: 16, color: '#111827', fontWeight: 450, fontFamily: 'DMM' }}>Top Up History</span>
                            <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB', marginLeft: 14 }} />
                        </div>

                        {loading ? (
                            <div style={{ color: '#9CA3AF', marginTop: 10, fontSize: 13 }}>Loading...</div>
                        ) : topups.length === 0 ? (
                            <div style={{ color: '#9CA3AF', marginTop: 10, fontSize: 13 }}>No top ups yet.</div>
                        ) : (
                            <div style={{ marginTop: 14 }}>
                                {topups.map(topup => {
        const pill = statusPill(topup.status);
        let pillBg = '#FEF3C7', pillColor = '#D97706';

        if (topup.status === 'succeeded') {
            pillBg = '#ECFDF5';
            pillColor = '#059669';
        }

        if (topup.status === 'failed') {
            pillBg = '#FEF2F2';
            pillColor = '#DC2626';
        }

        if (topup.status === 'cancelled') {
            pillBg = '#F3F4F6';
            pillColor = '#6B7280';
        }

                                    return (
                                        <div
                                            key={topup.id}
                                            style={historyRowStyle}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span style={{ fontSize: 14, color: '#111827' }}>₹{topup.amountINR} · {topup.credits} credits</span>
                                                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{formatDate(topup.createdAt)}</span>
                                            </div>

                                            <span style={{ ...statusPillStyle, backgroundColor: pillBg, color: pillColor }}>
                                                {pill.icon} {pill.text}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

const homeStyle = {
    width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: 20,
    backgroundColor: '#5813ea',
    background: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 133, 244, 0.8) 50px, rgba(66, 133, 244, 0.8) 51px), repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(66, 133, 244, 0.8) 50px, rgba(66, 133, 244, 0.8) 51px), #5813ea`,
    boxSizing: 'border-box'
};

const contentStyle = {
    width: '85%', minHeight: '85vh', border: '1px solid #ccc', borderRadius: 15,
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    overflow: 'hidden', backgroundColor: 'white'
};

const headingStyle = {
    width: '100%', backgroundColor: 'white', fontSize: 18, fontFamily: 'DMM',
    fontWeight: 500, paddingTop: 5, paddingBottom: 5, display: 'flex',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 10
};

const glowStyle = {
    position: 'absolute', width: 220, height: 220, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(147,112,255,0.35), transparent 70%)',
    top: -80, right: -60, pointerEvents: 'none'
};

const walletIconWrap = {
    width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const dodoBadge = {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, color: '#000',
    backgroundColor: '#c6fe1e', border: '1px solid #E4D9FF', borderRadius: 70,
    padding: '4px 10px', fontWeight: 550, fontFamily: 'DMM'
};

const amountButtonStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 2, borderRadius: 10, border: '1.5px solid', fontFamily: 'DMM',
    padding: '12px 16px', outline: 'none', cursor: 'pointer', minWidth: 88,
    flex: 1, transition: 'all 0.15s ease'
};

const payButtonStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DMM',
    fontSize: 16, color: 'white', backgroundColor: '#5813EA', borderRadius: 10,
    border: 'none', outline: 'none', padding: 13, cursor: 'pointer', width: '100%',
    transition: 'background-color 0.15s ease', fontWeight: 'bold'
};

const testModeRow = {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#1F2937',
    background: '#F8F7FF', border: '1px solid #C4B5FD', borderRadius: 8,
    padding: '7px 11px', fontWeight: 500, fontFamily: 'DMM', marginTop: 10
};

const checkAgainStyle = {
    fontFamily: 'DMM', fontSize: 13, color: '#5813EA', backgroundColor: 'white',
    borderRadius: 10, border: '1.5px solid #5813EA', outline: 'none',
    padding: '9px 16px', cursor: 'pointer', marginTop: 12, alignSelf: 'flex-start'
};

const historyHeaderRow = {
    display: 'flex', alignItems: 'center', marginTop: 32, fontFamily: 'DMM'
};

const historyRowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 12, border: '1px solid #F3F4F6',
    padding: 16, marginBottom: 10, transition: 'all 0.2s ease'
};

const statusPillStyle = {
    display: 'flex', alignItems: 'center', gap: 6, border: 'none',
    borderRadius: 100, padding: '4px 12px', fontSize: 12, fontWeight: 600
};

export default Wallet;