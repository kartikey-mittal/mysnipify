import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCalendarAlt, faChalkboardUser, faBook, faUserGraduate, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import Navbar1 from '../Navbar1';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Firebase';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../utils/avatar';
import gif from '../assets/connection.gif';

const baseDomains = ['C++', 'JavaScript', 'Python', 'React', 'Node.js', 'C', 'Java', 'PHP'];
const AVATAR_COLORS = ['#5813EA', '#0E7FA6', '#B45309', '#BE185D', '#0F766E', '#C2410C', '#4338CA', '#15803D'];

const getAvatarColor = (name = '') => {
    let total = 0;
    for (const char of name) total += char.charCodeAt(0);
    return AVATAR_COLORS[total % AVATAR_COLORS.length];
};

const FindTutor = () => {
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 615);
    const [tutors, setTutors] = useState([]);
    const [domains, setDomains] = useState(baseDomains);
    const [selectedDomain, setSelectedDomain] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 615);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchTutors = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'Skilled'));
                const tutorList = [];
                const domainList = [...baseDomains];

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const skills = data.selectedSkills || [];

                    skills.forEach((skill) => {
                        if (!domainList.includes(skill)) domainList.push(skill);
                    });

                    tutorList.push({
                        id: doc.id,
                        name: data.Name,
                        email: data.Email,
                        skills: skills,
                        profession: data.selectedProfession || ''
                    });
                });

                setTutors(tutorList);
                setDomains(domainList);
            } catch (error) {
                console.error('Error fetching tutors:', error);
            }

            setLoading(false);
        };

        fetchTutors();
    }, []);

    const filteredTutors = tutors.filter((tutor) => {
        const domainMatch = selectedDomain === 'All' || tutor.skills.includes(selectedDomain);
        const searchMatch = !search.trim() || tutor.name.toLowerCase().includes(search.trim().toLowerCase());
        return domainMatch && searchMatch;
    });

    const homeStyle = {
        minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: 20,
        backgroundColor: '#5813ea',
        background: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 133, 244, 0.8) 50px, rgba(66, 133, 244, 0.8) 51px), repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(66, 133, 244, 0.8) 50px, rgba(66, 133, 244, 0.8) 51px), #5813ea`
    };

    const contentStyle = {
        width: isMobileView ? '100%' : '85%', minHeight: '85vh', border: '1px solid #ccc', borderRadius: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', backgroundColor: 'white'
    };

    const headingStyle = {
        width: '100%', backgroundColor: 'white', fontSize: 19, fontFamily: 'DMM', fontWeight: 450,
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #EFEDF7', boxSizing: 'border-box'
    };

    const mainboxStyle = {
        width: '100%', backgroundColor: '#FBFAFE', borderRadius: 0, overflowY: 'auto',
        scrollbarWidth: 'none', msOverflowStyle: 'none', padding: isMobileView ? 16 : '20px 28px 28px',
        boxSizing: 'border-box', flex: 1
    };

    const chipStyle = (active) => ({
        backgroundColor: active ? '#5813EA' : 'white', color: active ? 'white' : '#4B5563',
        borderRadius: 8, border: active ? 'none' : '1px solid #E4E1F0', fontFamily: 'DMM',
        padding: '7px 14px', outline: 'none', marginRight: 8, marginBottom: 8, cursor: 'pointer',
        fontSize: 13, fontWeight: active ? 600 : 500, transition: 'all 0.15s ease',
        boxShadow: active ? '0 2px 6px rgba(88,19,234,0.25)' : 'none'
    });

    const gifStyle = { marginTop: 50, width: '40%', height: '40%', objectFit: 'cover' };

    return (
        <>
            <Navbar1 />

            <div style={homeStyle}>
                <div style={contentStyle}>

                    <div style={headingStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1F1147' }}>
                            <span style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: '#EFE9FD', color: '#5813EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                                <FontAwesomeIcon icon={faChalkboardUser} />
                            </span>
                            Find a Tutor
                        </div>

                        <button
                            onClick={() => navigate('/learner/mybookings')}
                            style={{ backgroundColor: '#0E9F6E', color: 'white', borderRadius: 8, border: 'none', fontFamily: 'DMM', padding: '9px 16px', outline: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500, transition: 'all 0.15s ease' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#0B7E58'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#0E9F6E'}
                        >
                            <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: 8 }} />
                            My Bookings
                        </button>
                    </div>

                    <div style={mainboxStyle}>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 18 }}>
                            <div style={{ position: 'relative', flex: isMobileView ? '1 1 100%' : '0 1 340px' }}>
                                <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 14, top: 12, color: '#9B93B5', fontSize: 13 }} />

                                <input
                                    type="text"
                                    placeholder="Search tutor by name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', borderRadius: 9, padding: '10px 14px 10px 38px', border: '1px solid #E4E1F0', fontFamily: 'DMM', fontSize: 13, outline: 'none', transition: 'all 0.15s ease', backgroundColor: 'white' }}
                                    onFocus={(e) => { e.target.style.borderColor = '#5813EA'; e.target.style.boxShadow = '0 0 0 3px rgba(88,19,234,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#E4E1F0'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <div style={{ flex: 1, minWidth: isMobileView ? '100%' : 260 }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                    <button style={chipStyle(selectedDomain === 'All')} onClick={() => setSelectedDomain('All')}>All</button>

                                    {domains.map((domain) => (
                                        <button key={domain} style={chipStyle(selectedDomain === domain)} onClick={() => setSelectedDomain(domain)}>
                                            {domain}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {!loading && (
                            <div style={{ fontFamily: 'DMM', fontSize: 12.5, color: '#8A82A3', marginBottom: 12 }}>
                                {filteredTutors.length} {filteredTutors.length === 1 ? 'tutor' : 'tutors'} available
                                {selectedDomain !== 'All' ? ` in ${selectedDomain}` : ''}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center' }}>
                                <img src={gif} alt="Loading gif" style={gifStyle} />
                            </div>
                        ) : filteredTutors.length === 0 ? (
                            <div style={{ textAlign: 'center', fontFamily: 'DMM', color: '#7D716A', padding: 40 }}>
                                No tutors found. Try a different name or domain.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>

                                {filteredTutors.map((tutor) => (
                                    <div
                                        key={tutor.id}
                                        style={{ display: 'flex', flexDirection: 'column', border: '1px solid #ECE9F5', borderRadius: 14, padding: 16, backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(31,17,71,0.03)', transition: 'all 0.15s ease' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 24px rgba(31,17,71,0.09)'; e.currentTarget.style.borderColor = '#DCD5F5'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,17,71,0.03)'; e.currentTarget.style.borderColor = '#ECE9F5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >

                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: getAvatarColor(tutor.name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DMM', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                                                {getInitials(tutor.name)}
                                            </div>

                                            <div style={{ minWidth: 0, textAlign: 'left' }}>
                                                <div style={{ fontFamily: 'DMM', fontSize: 15, fontWeight: 700, color: '#1F1147', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {tutor.name}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#8A82A3', fontFamily: 'DMM', fontSize: 12, marginTop: 3 }}>
                                                    <FontAwesomeIcon icon={faUserGraduate} style={{ fontSize: 10 }} />
                                                    {tutor.profession || 'Expert Tutor'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid #F2F0F9', margin: '14px 0 12px' }} />

                                        {tutor.skills.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {tutor.skills.slice(0, 4).map((skill) => (
                                                    <span key={skill} style={{ backgroundColor: 'rgba(88,19,234,0.07)', color: '#5813EA', borderRadius: 7, fontFamily: 'DMM', padding: '4px 9px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <FontAwesomeIcon icon={faBook} style={{ fontSize: 9 }} />
                                                        {skill}
                                                    </span>
                                                ))}

                                                {tutor.skills.length > 4 && (
                                                    <span style={{ backgroundColor: '#F2F0F9', color: '#6B6284', borderRadius: 7, fontFamily: 'DMM', padding: '4px 9px', fontSize: 11.5, fontWeight: 600 }}>
                                                        +{tutor.skills.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span style={{ border: '1px dashed #D9D4EC', color: '#A79FC2', borderRadius: 7, fontFamily: 'DMM', padding: '4px 9px', fontSize: 11.5, fontStyle: 'italic', width: 'fit-content' }}>
                                                Add skills
                                            </span>
                                        )}

                                        <button
                                            style={{ backgroundColor: '#F0FBF6', color: '#0B7E58', borderRadius: 9, border: '1px solid #D3F1E3', fontFamily: 'DMM', padding: '9px 12px', outline: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 300, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s ease' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0E9F6E'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#0E9F6E'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F0FBF6'; e.currentTarget.style.color = '#0B7E58'; e.currentTarget.style.borderColor = '#D3F1E3'; }}
                                            onClick={() => navigate(`/learner/tutor/${tutor.id}?domain=${encodeURIComponent(selectedDomain)}`)}
                                        >
                                            <span>
                                                <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: 8 }} />
                                                View Availability
                                            </span>
                                            <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 11 }} />
                                        </button>

                                    </div>
                                ))}

                            </div>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
};

export default FindTutor;