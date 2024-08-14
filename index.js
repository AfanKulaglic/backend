require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Express app and server setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Mongoose setup
const dbUri = process.env.MONGODB_URI;

mongoose.connect(dbUri)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Middleware setup
app.use(bodyParser.json());
app.use(cors({
    origin: 'http://localhost:5173', // Dozvoljava samo ovu domenu
    methods: ['GET', 'POST', 'PATCH', 'DELETE'] // Dozvoljava ove HTTP metode
}));

// Import routes
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api', dataRoutes);
app.use('/api', authRoutes);

// Socket.IO setup
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('sendMessage', (message) => {
        // Emit the message to other clients
        io.emit('newMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
