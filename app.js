const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = 3000;

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Dhanasri@143',
    database: process.env.DB_NAME || 'event_elite'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to the database with thread ID ' + db.threadId);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your_secret_key',
        resave: false,
        saveUninitialized: true,
    })
);

// Routes

// Homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Login Page
app.get('/login', (req, res) => {
    res.render('login');
});

// Login Functionality
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    req.session.user = results[0];
                    return res.redirect('/events');
                } else {
                    return res.render('login', { errorMessage: 'Username or password is incorrect' });
                }
            });
        } else {
            res.render('login', { errorMessage: 'Username or password is incorrect' });
        }
    });
});

// Register Page
app.get('/register', (req, res) => {
    res.render('register');
});

// Register Functionality
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;
        db.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hash],
            (err, results) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.render('register', { errorMessage: 'Username already exists' });
                    }
                    throw err;
                }
                res.redirect('/login');
            }
        );
    });
});

// Events Page with Search Functionality
app.get('/events', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const searchQuery = req.query.search || '';
    let events = [
        {
            EventName: "Marriage Ceremony",
            EventDescription: "A traditional marriage ceremony.",
            EventImage: "https://shreekalyanam.com/public/uploads/blogs/profile_1725948352.jpg",
            EventTime: "3-5 hours",
            EventContact: "+91 9876543210",
        },
        {
            EventName: "Birthday Function",
            EventDescription: "A grand birthday celebration.",
            EventImage: "https://m.media-amazon.com/images/I/71i5k1PLSSL._AC_UF1000,1000_QL80_.jpg",
            EventTime: "2-4 hours",
            EventContact: "+91 8765432109",
        },
        {
            EventName: "Haldi Ceremony",
            EventDescription: "A vibrant Haldi ceremony.",
            EventImage: "https://img.staticmb.com/mbcontent/images/crop/uploads/2022/12/haldi-decoration_0_1200.jpg",
            EventTime: "2-3 hours",
            EventContact: "+91 7654321098",
        },
        {
            EventName: "Mehendi Ceremony",
            EventDescription: "A colorful Mehendi ceremony.",
            EventImage: "https://www.happywedding.app/blog/wp-content/uploads/2019/04/The-Mehndi-Ceremony.jpg",
            EventTime: "3-4 hours",
            EventContact: "+91 6543210987",
        },
        {
            EventName: "Sangeet Night",
            EventDescription: "A fun-filled Sangeet night.",
            EventImage: "https://i.ytimg.com/vi/bdoqUbWbrpA/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDoi5wrAGpZ51qhdhDDBY_ZkK3p5g",
            EventTime: "4-6 hours",
            EventContact: "+91 5432109876",
        },
        {
            EventName: "Food Carnival",
            EventDate: "2024-11-25",
            EventDescription: "A carnival with a variety of food stalls.",
            EventImage: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBmYsuumu3KlwQAqZyi4IiiR6RpdwXlj7Pew&s",
            EventTime: "3-5 hours",
            EventContact: "+91 4321098765",
        },
        {
            EventName: "Art Expo",
            EventDescription: " An Art Exhibition with an number of arts.",
            EventImage: "https://images.squarespace-cdn.com/content/v1/51bca2f6e4b0e31e21504292/9368ef0d-75dc-4bda-8874-b260d3573689/AZ+EXPO+2023+-+7.jpeg",
            EventTime: "4-6 hours",
            EventContact: "+91 5432109876",
        }
    ];

    if (searchQuery) {
        events = events.filter(event =>
            event.EventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.EventDescription.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    res.render('events', { events, searchQuery });
});

// Booking Page
app.get('/book/:eventName', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const eventName = req.params.eventName;
    res.render('book', { eventName });
});

app.post('/book', (req, res) => {
    const { eventName, eventDate, userName, userEmail, userPhone } = req.body;

    // Basic validation for missing fields
    if (!eventName || !eventDate || !userName || !userEmail || !userPhone) {
        return res.status(400).send('All fields are required');
    }

    // Insert booking data into the database
    db.query(
        'INSERT INTO bookings (eventName, eventDate, userName, userEmail, userPhone) VALUES (?, ?, ?, ?, ?)',
        [eventName, eventDate, userName, userEmail, userPhone],
        (err, results) => {
            if (err) {
                console.error('Error inserting booking:', err);
                return res.status(500).send('Internal Server Error');
            }

            // Redirect to Thank You page with data passed in query parameters
            res.redirect(`/thankyou?userName=${encodeURIComponent(userName)}&eventName=${encodeURIComponent(eventName)}`);
        }
    );
});

// Thank You Page
app.get('/thankyou', (req, res) => {
    const { userName, eventName } = req.query;
    res.render('thankyou', { userName, eventName });
});


// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
