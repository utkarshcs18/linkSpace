const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Routes (To be implemented)
// const authRoutes = require('./routes/auth.routes');
// app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'STAMP Secure Chat API is running.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
