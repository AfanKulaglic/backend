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
    .then(() => console.log('Povezan sa MongoDB-om'))
    .catch((err) => console.error('Greška pri povezivanju s MongoDB-om:', err));
    
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api', dataRoutes);
app.use('/api', authRoutes);

io.on('connection', (socket) => {
    console.log('Novi klijent je povezan');

    
    socket.on('sendMessage', (data) => {
        
        io.emit('receiveMessage', data);
    });

    
    socket.on('disconnect', () => {
        console.log('Klijent je odspojen');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});
