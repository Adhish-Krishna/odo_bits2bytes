/**
 * Backend API Implementation Example (Node.js/Express)
 * This is a reference implementation. Adapt to your backend framework.
 */

// Required packages:
// npm install express bcryptjs jsonwebtoken dotenv cors

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Mock database (replace with real database)
const users = new Map();

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Auth Routes

/**
 * POST /api/auth/signup
 * Create new user account
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    if (users.has(email)) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      createdAt: new Date()
    };

    users.set(email, user);

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = users.get(email);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If account exists, reset link sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    // await sendEmail(email, resetLink);

    res.json({ success: true, message: 'Reset link sent to email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = users.get(decoded.email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/auth/google
 * Google OAuth login
 */
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    // TODO: Verify Google ID token
    // const ticket = await client.verifyIdToken({
    //   idToken,
    //   audience: process.env.GOOGLE_CLIENT_ID
    // });
    // const payload = ticket.getPayload();

    // For now, create/get user based on Google info
    // In production, verify the token with Google

    res.status(501).json({ message: 'Google login not implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/auth/apple
 * Apple OAuth login
 */
app.post('/api/auth/apple', async (req, res) => {
  try {
    const { idToken } = req.body;

    // TODO: Verify Apple ID token
    // In production, verify the token with Apple

    res.status(501).json({ message: 'Apple login not implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token
 */
app.get('/api/auth/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    res.json({ success: true, message: 'Token is valid' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/**
 * Environment variables needed:
 * JWT_SECRET=your-super-secret-jwt-key
 * GOOGLE_CLIENT_ID=your-google-client-id
 * APPLE_CLIENT_ID=your-apple-client-id
 * FRONTEND_URL=http://localhost:5173
 * DATABASE_URL=your-database-url (if using real DB)
 */
