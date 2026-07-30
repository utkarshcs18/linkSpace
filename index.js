const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});


// const authRoutes = require('./routes/auth.routes');
// app.use('/api/auth', authRoutes);

app.get('/api/status', (req, res) => {
    res.json({ message: 'linkSpace Secure Chat API is running.' });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`linkSpace (STAMP) Monolithic Server running on http://localhost:${PORT}`);
});
