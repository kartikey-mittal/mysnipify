import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../Firebase';

export const getSkilledId = async () => {
  const stored = localStorage.getItem('SkilledId');
  if (stored) return stored;

  const email = localStorage.getItem('SkilledEmail');
  if (!email) return null;

  try {
    const snapshot = await getDocs(query(collection(db, 'Skilled'), where('Email', '==', email)));
    if (!snapshot.empty) {
      const id = snapshot.docs[0].id;
      localStorage.setItem('SkilledId', id);
      return id;
    }
  } catch (error) {
    console.error('Error resolving skilled id:', error);
  }
  return null;
};

export const getLearnerId = async () => {
  const stored = localStorage.getItem('LearnerId');
  if (stored) return stored;

  const email = localStorage.getItem('LearnerEmail');
  if (!email) return null;

  try {
    const snapshot = await getDocs(query(collection(db, 'Learner'), where('Email', '==', email)));
    if (!snapshot.empty) {
      const id = snapshot.docs[0].id;
      localStorage.setItem('LearnerId', id);
      return id;
    }
  } catch (error) {
    console.error('Error resolving learner id:', error);
  }
  return null;
};
