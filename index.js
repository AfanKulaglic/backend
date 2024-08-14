require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http'); // Uvoz http modula
const { Server } = require('socket.io'); // Uvoz Server iz socket.io

const app = express();
const server = http.createServer(app); // Kreiranje HTTP servera
const io = new Server(server, { cors: { origin: "*" } }); // Kreiranje nove instance Socket.IO servera

app.use(bodyParser.json());
app.use(cors());

// Povezivanje s MongoDB-om
const dbUri = process.env.MONGODB_URI;

mongoose.connect(dbUri)
    .then(() => console.log('Povezan sa MongoDB-om'))
    .catch((err) => console.error('Greška pri povezivanju s MongoDB-om:', err));

// Rute
const dataRoutes = require('./routes/dataRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api', dataRoutes);
app.use('/api', authRoutes);

// Kada se klijent poveže
io.on('connection', (socket) => {
    console.log('Novi klijent je povezan');

    // Primanje poruke od klijenta
    socket.on('sendMessage', (data) => {
        // Emitiranje poruke svim povezanim klijentima
        io.emit('receiveMessage', data);
    });

    // Kada se klijent odvoji
    socket.on('disconnect', () => {
        console.log('Klijent je odspojen');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server radi na portu ${PORT}`);
});
