import { Router } from 'express';
import { firestore, firebaseAuth } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.post('/register', requireAuth, async (req, res, next) => {
  try {
    const { name, email, studentId, department, role } = req.body;
    const userRole = role === 'visitor' ? 'visitor' : 'student';
    
    const userRef = firestore.collection('users').doc(req.userId);
    const doc = await userRef.get();
    
    const userData = {
      id: req.userId,
      name,
      email,
      studentId: studentId || null,
      department: department || null,
      role: userRole,
      createdAt: doc.exists ? doc.data().createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await userRef.set(userData, { merge: true });
    res.status(201).json({ user: userData });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userRef = firestore.collection('users').doc(req.userId);
    const doc = await userRef.get();
    
    if (!doc.exists) {
      const userRecord = await firebaseAuth.getUser(req.userId);
      const userData = {
        id: req.userId,
        email: userRecord.email || '',
        name: userRecord.displayName || (userRecord.email ? userRecord.email.split('@')[0] : 'Student'),
        role: 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await userRef.set(userData);
      return res.json(userData);
    }
    
    res.json(doc.data());
  } catch (err) { next(err); }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, department, studentId } = req.body;
    const userRef = firestore.collection('users').doc(req.userId);
    
    const updateData = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (studentId !== undefined) updateData.studentId = studentId;
    
    await userRef.update(updateData);
    const updatedDoc = await userRef.get();
    res.json(updatedDoc.data());
  } catch (err) { next(err); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await firebaseAuth.revokeRefreshTokens(req.userId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Visitor: anonymous Firebase auth + store details in Firestore
router.post('/visitor', async (req, res, next) => {
  try {
    const { uid, name, phone, purpose } = req.body;

    if (!uid) return res.status(400).json({ error: 'uid is required.' });
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!phone?.trim()) return res.status(400).json({ error: 'Phone number is required.' });
    if (!purpose) return res.status(400).json({ error: 'Purpose of visit is required.' });

    const visitorData = {
      uid,
      name: name.trim(),
      phone: '+91' + phone.trim().replace(/^\+91/, ''),
      purpose,
      role: 'visitor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in a separate 'visitors' collection
    await firestore.collection('visitors').doc(uid).set(visitorData, { merge: true });

    res.status(201).json({ user: visitorData });
  } catch (err) { next(err); }
});

export default router;