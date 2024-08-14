const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:5173', // Frontend URL
        methods: ['GET', 'POST']
    }
});

// CORS middleware
app.use(cors({
    origin: 'http://localhost:5173', // Frontend URL
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true
}));

// Mongoose connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());

// Import routes
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api', dataRoutes);
app.use('/api', authRoutes);

// Socket.IO
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('sendMessage', (data) => {
        // Emit new message to all connected clients
        io.emit('newMessage', data);
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
