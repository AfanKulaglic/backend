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

app.use(bodyParser.json());
app.use(cors());

const dbUri = process.env.MONGODB_URI;

mongoose.connect(dbUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api', dataRoutes);
app.use('/api', authRoutes);

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('sendMessage', (data) => {
        io.emit('newMessage', data); // Updated event name
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
