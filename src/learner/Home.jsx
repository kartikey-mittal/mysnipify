import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faCalendarAlt, faVideo } from '@fortawesome/free-solid-svg-icons';


import Navbar1 from '../Navbar1';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, storage } from '../Firebase';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import stringSimilarity from 'string-similarity';

const skillsData = ['C++', 'JavaScript', 'Python', 'React', 'Node.js', "C", 'Java', 'PHP'];

const Home = () => {

    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 615);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 615);
        };

        window.addEventListener('resize', handleResize);

        // Clean up the event listener on component unmount
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // useEffect(() => {
    //     if (isMobileView) {
    //       document.body.style.overflowY = 'hidden';
    //     } else {
    //       document.body.style.overflowY = 'auto';
    //     }
    //   }, [isMobileView]);

    const [selectedSkill, setSelectedSkill] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const [uploadStatus, setUploadStatus] = useState({ success: false, fileName: '' });
    const [textInput, setTextInput] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [activeTab, setActiveTab] = useState('instant');
    const [tutors, setTutors] = useState([]);
    const isContinueButtonDisabled = !textInput.trim();

    useEffect(() => {
        getDocs(collection(db, 'Skilled'))
            .then((snap) => {
                const list = snap.docs.slice(0, 12).map((d) => ({ id: d.id, ...d.data() }));
                setTutors(list);
            })
            .catch((err) => console.error('Error loading tutors:', err));
    }, []);

    // Calculate opacity based on whether there is text in the input
    // const continueButtonOpacity = isContinueButtonDisabled ? 0.5 : 1
    const isConnectButtonDisabled = selectedSkill === null;

    // Calculate opacity based on whether a skill is selected
    const connectButtonOpacity = isConnectButtonDisabled ? 0.5 : 1;

    const handleSkillClick = (index) => {
        setSelectedSkill(index);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        await handleFiles(files);
    };

    const handleFileInput = async (e) => {
        const files = Array.from(e.target.files);
        await handleFiles(files);
    };

    const handleFiles = async (files) => {
        setUploadedFiles(files);

        try {
            const storageRef = ref(storage, `images/${files[0].name}`);
            const reader = new FileReader();

            reader.onloadend = async () => {
                if (typeof reader.result === 'string') {
                    await uploadString(storageRef, reader.result, 'data_url');
                    const downloadURL = await getDownloadURL(storageRef);
                    setImageUrl(downloadURL);

                    // Now you can use the downloadURL as needed
                    console.log('Download URL:', downloadURL);
                } else {
                    console.error('Invalid dataURL:', reader.result);
                }
            };

            reader.onerror = (error) => {
                console.error('Error reading file:', error);
            };

            reader.readAsDataURL(files[0]);
        } catch (error) {
            console.error('Error uploading image:', error);
        }

        setUploadStatus({ success: true, fileName: files.map((file) => file.name).join(', ') });
    };


    const handleTextInputChange = (e) => {
        setTextInput(e.target.value);
    };

    const navigate = useNavigate();
    const handleConnectButtonClick = async () => {
        try {
            // Get the selected skill as a string
            const selectedSkillString = selectedSkill !== null ? skillsData[selectedSkill] : '';

            // Add a new document with a generated id.
            const docRef = await addDoc(collection(db, 'Requests'), {
                Image: imageUrl,
                Question: textInput,
                Skills: selectedSkillString,
                Name: learnerName,
                Status: 0,
                EmailStudent: learnerEmail
            });

            console.log('Document written with ID: ', docRef.id);


            const skilledCollectionRef = collection(db, 'Skilled');
            const skilledQuerySnapshot = await getDocs(query(skilledCollectionRef, where('selectedSkills', 'array-contains', selectedSkillString)));

            // Array to store matched documents
            const fcmtokendata = [];

            // Log the names of the documents that match the selected skill
            skilledQuerySnapshot.forEach((doc) => {
                fcmtokendata.push(doc.data().fcmtoken);
                // You can perform any other actions with the matched documents here
            });

            // Log the array of matched documents
            console.log('Matched documents:', fcmtokendata);

            // ------------------------fcm Notification-------------------
            // try {
            //     const response = await axios.post(
            //         'https://fcm.googleapis.com/fcm/send',
            //         {
            //             registration_ids: fcmtokendata,
            //             notification: {
            //                 title: 'Question: '+textInput,
            //                 body: 'Asked by '+learnerName,
            //             }
            //         },
            //         {
            //             headers: {
            //                 Authorization: 'key=AAAALbx6OSY:APA91bE-XoNsHHFbu9VxAY826Fwv4QJ2Z6IVjxJqnZZkvDsZkcQSeZOhCrKZHDZe7SJa-CpCZJ_PlawzXrK1BQheWT4Lj28XNuhK2a5ZDULkDoqtm8BE8xILGp3YuGuEBmp_gITO0tz9',
            //                 'Content-Type': 'application/json'
            //             }
            //         }
            //     );

            //     console.log('Response from FCM:', response.data);

            //     if (response.data.success) {
            //         alert('Notification sent successfully!');
            //     } else {
            //         alert('Failed to send notification. Check the server logs for details.');
            //     }
            // } catch (error) {
            //     console.error('Error sending notification:', error);
            //     alert('An error occurred while sending the notification.');
            // }

            // Delay the navigation by 5 seconds--------------------------------------------👇👇👇👇
            setTimeout(() => {
                // Redirect to the learner connect page with the document ID
                navigate(`/learner/connect/${docRef.id}`);
            }, 50);

            // Reset states after successful submission
            setTextInput('');
            setSelectedSkill(null);
            setUploadedFiles([]);
            setUploadStatus({ success: false, fileName: '' });
            setImageUrl('');
        } catch (error) {
            console.error('Error adding document: ', error);
        }
    };

    const handleSearchButtonClick = async () => {
        try {
            // Get the selected skill as a string
            const selectedSkillString = selectedSkill !== null ? skillsData[selectedSkill] : '';
    
            // Reference to the "Questions" collection
            const questionsCollectionRef = collection(db, 'Requests');
    
            // Query to get documents where the "Skill" attribute matches the selected skill
            const questionsQuerySnapshot = await getDocs(query(questionsCollectionRef, where('Skills', '==', selectedSkillString)));
    
            // Log the data from the matching documents
            questionsQuerySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Document ID:', doc.id);
                console.log('Question:', data.Question);
                console.log('Skill:', data.Skill);
                console.log('Screenshots:', data.Screenshots);
                console.log('--------------------------');
            });
    
            const questionArray = questionsQuerySnapshot.docs.map(doc => {
                return {
                    id: doc.id,
                    question: doc.data().Question
                };
            });
    
            // Perform similarity matching
            const matches = stringSimilarity.findBestMatch(textInput, questionArray.map(item => item.question));
            const mostSimilarQuestion = questionArray[matches.bestMatchIndex];
    
            // Update the search output
            // Log the document ID of the most similar question
            console.log('Most similar question (Document ID):', mostSimilarQuestion.question);
            console.log('Most similar question (Document ID):', mostSimilarQuestion.id);
            navigate(`/question/${mostSimilarQuestion.id}`);

            
        } catch (error) {
            alert('No question found :(');
            console.error('Error fetching data from Firestore:', error);
        }
    };
    
    


    const homeStyle = {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#5813ea',
        background: `
      repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255, 133, 244, 0.8) 50px, rgba(66, 133, 244, 0.8) 51px),
      repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(66, 133, 244, 0.8) 50px, rgba(66, 133, 244, 0.8) 51px),
      #5813ea`,
    };

    const contentStyle = {
        width: '85%',
        height: '100%',
        border: '1px solid #ccc',
        borderRadius: 15,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        overflow: 'hidden',
        backgroundColor: 'white',
    };

    const headingStyle = {
        width: '100%',
        backgroundColor: 'white',
        fontSize: 20,

        fontFamily: 'DMM',
        fontWeight: 500,
        paddingTop: 5,
        paddingBottom: 5,
    };

    const mainboxStyle = {
        width: '90%',
        height: '85%',
        backgroundColor: 'white',
        borderRadius: 15,
        margin: 'auto',
        marginTop: '10px',
        border: '1px solid blue',
        boxShadow: '0px 08px 10px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
    };

    const tabBarStyle = {
        display: 'flex',
        gap: 10,
        padding: '14px 20px 0 20px',
        borderBottom: '1px solid #E5E7EB',
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        zIndex: 5,
    };

    const tabButtonStyle = (isActive) => ({
        fontFamily: 'DMM',
        fontSize: 15,
        fontWeight: 450,
        color: isActive ? 'white' : '#5813EA',
        backgroundColor: isActive ? '#ff7b6a' : 'transparent',
        borderRadius: 100,
        border: isActive ? 'none' : '1px solid #afadb3',
        outline: 'none',
        padding: '8px 22px',
        cursor: 'pointer',
        marginBottom: 14,
    });

    const tutorCardStyle = {
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: '12px 16px',
        width: 220,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontFamily: 'DMM',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    };

    const bookButtonStyle = {
        fontFamily: 'DMM',
        fontSize: 13,
        color: '#5813EA',
        backgroundColor: 'transparent',
        border: '1px solid #D8CCF7',
        borderRadius: 8,
        outline: 'none',
        padding: '7px 14px',
        cursor: 'pointer',
        marginTop: 4,
        fontWeight: 400,
    };

    // const dropAreaStyle = {
    //     width: 341,
    //     height: 151,
    //     border: isDragOver ? '2px dashed black' : '1px solid transparent',
    //     borderRadius: 15,
    //     position: 'relative',
    //     display: 'flex',
    //     flexDirection: 'column',
    //     alignItems: 'center',
    //     justifyContent: 'center',
    // };

    const buttonText = uploadStatus.success
        ? `File uploaded successfully:\n${uploadStatus.fileName}`
        : 'Drag and Drop\nor Click to Upload';



    const bgColor = 'white';
    const textColor = 'black';
    const selectedBgColor = '#5813EA';
    const selectedTextColor = 'white';
    const initialBorderRadius = 50;
    const borderColor = '#7D716A';
    const borderWidth = '0.2px';

    const learnerName = localStorage.getItem('LearnerName') || 'Learner'; // Use 'Learner' as a default name if not found
    const learnerEmail = localStorage.getItem('LearnerEmail') || 'g6.kartikey@gmail.com'; // Use 'Learner' as a default name if not found

    return (
        <>
            <Navbar1 />
            <div style={homeStyle}>
                <div style={contentStyle}>
                    <div
                        style={{
                            ...headingStyle,
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ marginLeft: 30, margin: 3 ,marginTop:5}}>
                            <FontAwesomeIcon icon={faBolt} style={{ marginRight: 8, color: '#ff7b6a',marginLeft:5 }} />
                        
                            Hi <span style={{color:"#5813ea",fontWeight:500}}>{learnerName},</span> what is your question today?
                        </div>
                    </div>
                    <div style={mainboxStyle}>
                        <div style={tabBarStyle}>
                            <button
                                onClick={() => setActiveTab('instant')}
                                style={tabButtonStyle(activeTab === 'instant')}
                            >
                                <FontAwesomeIcon icon={faBolt} style={{ marginRight: 8 }} />
                                Instant
                            </button>
                            <button
                                onClick={() => navigate('/learner/find-tutor')}
                                style={tabButtonStyle(activeTab === 'book')}
                            >
                                <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: 8 }} />
                                Book a Session
                            </button>
                        </div>

                        {activeTab === 'instant' && (<>
                        <div style={{ padding: '10px 20px', textAlign: 'left' }}>
                            <div style={{ display: 'flex' }}>
                                <button
                                    style={{
                                        backgroundColor: '#5813EA',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: 30,
                                        height: 30,
                                        marginRight: 20,
                                        marginTop: 15,
                                        border: 'none',
                                    }}
                                >
                                    1
                                </button>
                                <h3 style={{ fontWeight: 500 }}>What is your Question?</h3>
                            </div>

                            <div
                                style={{
                                    marginTop: 2,
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    backgroundColor: 'transparent',
                                    flexDirection: isMobileView ? 'column' : 'row',

                                    alignItems: 'center'
                                }}
                            >
                                <label style={{ width: isMobileView ? '100%' : '100%', height: 150 }}>
                                    <input
                                        type="text"
                                        placeholder="Type your question here.."
                                        value={textInput}
                                        onChange={handleTextInputChange}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            paddingTop: 5,
                                            paddingBottom: 15,
                                            paddingLeft: 20,
                                            fontWeight: '400',
                                            fontSize: 15,
                                            boxSizing: 'border-box',
                                            backgroundColor: '#F9F9F9',
                                            borderRadius: 15,
                                            border: '2px solid #7D716A',
                                            outline: 'none',
                                            borderWidth: '0.5px',
                                            lineHeight: '1.5',
                                            whiteSpace: 'pre-wrap',

                                        }}
                                        onFocus={(e) => (e.target.style.border = '2px solid #7D716A')}
                                        onBlur={(e) => (e.target.style.border = `2px solid ${borderColor}`)}
                                    />
                                </label>
                                {/* ------------------------drag and  drop ---------------------- */}
                                <div
                                    style={{
                                        marginLeft: '25px',
                                        height: isMobileView ? 100 : 151,
                                        border: isDragOver ? '2px dashed black' : '0.5px dashed #7D716A',
                                        borderRadius: 15,
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#F9F9F9',
                                        color: '#7D716A',
                                        width: isMobileView ? 200 : 341,
                                    }}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('fileInput').click()}
                                >
                                    {buttonText}
                                    <input
                                        id="fileInput"
                                        type="file"
                                        style={{ display: 'none' }}
                                        onChange={handleFileInput}
                                    />
                                    <p>Number of uploaded files: {uploadedFiles.length}</p>
                                </div>
                            </div>

                            {/* <div style={{ marginTop: 20, marginLeft: 40,width: 100, }}>
                                <button
                                    style={{
                                        fontFamily: 'DMM',
                                        fontSize: 15,
                                        color: 'white',
                                        backgroundColor: '#5813EA',
                                        borderRadius: 50,
                                        border: 'none',
                                        outline: 'none',
                                        padding: 10,
                                        paddingLeft: 15,
                                        paddingRight: 15,
                                        opacity: continueButtonOpacity,
                                        cursor: isContinueButtonDisabled ? 'not-allowed' : 'pointer',
                                        width: isMobileView ? '50%' : '100%',
                                    }}
                                    disabled={isContinueButtonDisabled}
                                >
                                    Continue
                                </button>
                            </div> */}



                            <div
                                style={{
                                    display: 'flex',
                                    marginTop: 5,
                                }}
                            >
                                <button
                                    style={{
                                        backgroundColor: '#5813EA',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: 30,
                                        height: 30,
                                        marginRight: 20,
                                        marginTop: 15,
                                        border: 'none',
                                    }}
                                >
                                    2
                                </button>
                                <h3 style={{ fontWeight: 500 }}>Add Details</h3>
                            </div>
                            {/* 2nd area starts ------------- */}
                            <div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        width: isMobileView ? '80%' : '30%',
                                        gap: 10,
                                        marginLeft: 30,
                                        // backgroundColor:'green'
                                    }}
                                >
                                    {skillsData.map((skill, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSkillClick(index)}
                                            style={{
                                                backgroundColor: selectedSkill === index ? selectedBgColor : bgColor,
                                                color: selectedSkill === index ? selectedTextColor : textColor,
                                                borderRadius: initialBorderRadius,
                                                border: `2px solid ${borderColor}`,
                                                borderWidth: borderWidth,
                                                fontFamily: 'DMM',
                                                padding: '10px',
                                                outline: 'none',
                                                margin: '5px',
                                                width: 'auto',
                                                whiteSpace: 'nowrap',
                                                opacity: isContinueButtonDisabled ? 0.5 : 1,
                                                cursor: isContinueButtonDisabled ? 'not-allowed' : 'pointer',
                                            }}
                                            disabled={isContinueButtonDisabled}
                                        >
                                            {skill}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2nd area closed ------------- */}
                        </div>

                        <div style={{ marginTop: 20, marginLeft: 40,display:'flex' ,justifyContent:'center',gap:'50px'}}>
                        <button
    style={{
        fontFamily: 'DMM',
        fontSize: 15,
        fontWeight: 600,
        color: '#FFFFFF',
        background: isConnectButtonDisabled
            ? '#9CA3AF'
            : 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
        borderRadius: 50,
        border: 'none',
        outline: 'none',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        opacity: connectButtonOpacity,
        cursor: isConnectButtonDisabled ? 'not-allowed' : 'pointer',
        marginBottom: '75px',
        minWidth: 135,
        boxShadow: isConnectButtonDisabled
            ? 'none'
            : '0 7px 18px rgba(22, 163, 74, 0.35)',
        transition: 'all 0.2s ease',
    }}
    disabled={isConnectButtonDisabled}
    onClick={handleConnectButtonClick}
>
    <FontAwesomeIcon
        icon={faVideo}
        style={{
            fontSize: 14,
        }}
    />
    Connect
</button>

                            {/* ---------Search btn------
                            <button
                                style={{
                                    fontFamily: 'DMM',
                                    fontSize: 15,
                                    color: 'white',
                                    backgroundColor: '#5813EA',
                                    borderRadius: 50,
                                    border: 'none',
                                    outline: 'none',
                                    padding: 10,
                                    paddingLeft: 15,
                                    paddingRight: 15,
                                    // opacity: connectButtonOpacity,
                                    cursor: 'pointer',
                                    marginBottom: '75px'
                                }}
                                //disabled={isConnectButtonDisabled}
                                onClick={handleSearchButtonClick}
                            >
                                Search
                            </button>
                            --- */}
                        </div>
                        </>)}
                        {activeTab === 'book' && (
                        <div style={{ padding: '20px 40px', textAlign: 'left', marginBottom: '40px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 5, marginLeft: 20 }}>
                                <button
                                    onClick={() => navigate('/learner/find-tutor')}
                                    style={{
                                        fontFamily: 'DMM',
                                        fontSize: 15,
                                        color: 'white',
                                        backgroundColor: '#5813EA',
                                        borderRadius: 50,
                                        border: 'none',
                                        outline: 'none',
                                        padding: '10px 20px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Find Tutors
                                </button>
                                <button
                                    onClick={() => navigate('/learner/mybookings')}
                                    style={{
                                        fontFamily: 'DMM',
                                        fontSize: 17,
                                        color: 'white',
                                        backgroundColor: '#0E9F6E',
                                        borderRadius: 50,
                                        border: 'none',
                                        outline: 'none',
                                        padding: '12px 26px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    My Bookings
                                </button>
                            </div>
                            <h3 style={{ fontWeight: 500, marginTop: 28 }}>All Tutors</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, marginLeft: 20 }}>
                                {tutors.length === 0 ? (
                                    <div style={{ color: '#7D716A' }}>No tutors yet.</div>
                                ) : (
                                    tutors.map((t) => (
                                        <div key={t.id} style={tutorCardStyle}>
                                            <div style={{ fontWeight: 500, fontSize: 15 }}>{t.Name}</div>
                                            <div style={{ fontSize: 12.5, color: '#6B7280', fontWeight: 400 }}>
                                                {(t.selectedSkills || []).join(' · ') || 'General'}
                                            </div>
                                            <button
                                                onClick={() => navigate(`/learner/tutor/${t.id}`)}
                                                style={bookButtonStyle}
                                            >
                                                Book a Session
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;
