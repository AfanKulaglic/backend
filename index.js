require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
const dbUri = process.env.MONGODB_URI;
mongoose.connect(dbUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Routes
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');
app.use('/api', dataRoutes);
app.use('/api', authRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle incoming messages
    socket.on('sendMessage', (data) => {
        console.log('Received message:', data);
        io.emit('newMessage', data); // Emit the event to all connected clients
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
