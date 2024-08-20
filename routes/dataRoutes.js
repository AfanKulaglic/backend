const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const DataSchema = new mongoose.Schema({
    nickname: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    messages: [
        {
            _id: { type: String, default: uuidv4 },
            user: String,
            content: String,
            timestamp: { type: Date, default: Date.now },
            toUser: String,
            seen: { type: Boolean, default: false } // Dodano polje "seen"
        }
    ]
});

const Data = mongoose.model('Data', DataSchema);

router.post('/data', async (req, res) => {
    try {
        const { nickname, image, email } = req.body;
        if (!nickname || !image || !email) {
            return res.status(400).send({ message: 'Nickname, URL slike ili email nedostaju' });
        }
        const newData = new Data({ nickname, image, email });
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        console.error('Greška pri spremanju nickname, slike ili email-a:', error.message);
        res.status(500).send({ message: 'Došlo je do greške pri spremanju podataka.' });
    }
});

router.get('/data', async (req, res) => {
    try {
        const data = await Data.find();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ message: 'Greška pri preuzimanju podataka', error });
    }
});

router.patch('/data/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { user, content, toUser, _id, timestamp } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Nevažeći ID format' });
    }
    if (!user || !content || !toUser || !_id || !timestamp) {
        return res.status(400).send({ message: 'Korisnik, sadržaj, korisnik kojem je poruka upućena, ID ili vremenski pečat nedostaju' });
    }

    try {
        const updatedFriendData = await Data.findById(id);
        if (!updatedFriendData) {
            return res.status(404).send({ message: 'Podaci prijatelja nisu pronađeni' });
        }

        const messageExistsForFriend = updatedFriendData.messages.some(m => m._id === _id);
        if (!messageExistsForFriend) {
            updatedFriendData.messages.push({ user, content, toUser, _id, timestamp });
            await updatedFriendData.save();
        }

        const userData = await Data.findOne({ nickname: user });
        if (userData) {
            const messageExistsForUser = userData.messages.some(m => m._id === _id);
            if (!messageExistsForUser) {
                userData.messages.push({ user, content, toUser, _id, timestamp });
                await userData.save();
            }
        }

        io.emit('newMessage', { friendData: updatedFriendData, userData }); // Emitovanje događaja
        res.status(200).send({ friendData: updatedFriendData, userData });
    } catch (error) {
        res.status(500).send({ message: 'Greška pri ažuriranju podataka s porukom', error });
    }
});

router.patch('/data/:id/messages/seen', async (req, res) => {
    const { id } = req.params;
    const { messageId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Nevažeći ID format' });
    }
    if (!messageId) {
        return res.status(400).send({ message: 'ID poruke je obavezan' });
    }

    try {
        const data = await Data.findById(id);
        if (!data) {
            return res.status(404).send({ message: 'Podaci nisu pronađeni' });
        }

        // Ažurirajte status "seen" za određenu poruku
        const message = data.messages.id(messageId);
        if (message) {
            message.seen = true;
            await data.save();
            res.status(200).send(data);
        } else {
            res.status(404).send({ message: 'Poruka nije pronađena' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Greška pri ažuriranju statusa viđeno', error });
    }
});

router.delete('/data/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Nevažeći ID format' });
    }
    try {
        const deletedData = await Data.findByIdAndDelete(id);
        if (!deletedData) {
            return res.status(404).send({ message: 'Podaci nisu pronađeni' });
        }
        const imagePath = path.join(__dirname, '../uploads', path.basename(deletedData.image));
        if (deletedData.image && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        res.status(200).send(deletedData);
    } catch (error) {
        res.status(500).send({ message: 'Greška pri brisanju podataka', error });
    }
});

module.exports = router;
