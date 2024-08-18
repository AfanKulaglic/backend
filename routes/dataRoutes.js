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
            toUser: String
        }
    ]
});

const Data = mongoose.model('Data', DataSchema);

router.post('/data', async (req, res) => {
    try {
        const { nickname, image, email } = req.body;
        if (!nickname || !image || !email) {
            return res.status(400).send({ message: 'Nickname, image URL, or email is missing' });
        }
        const newData = new Data({ nickname, image, email });
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        console.error('Error saving nickname, image, or email:', error.message);
        res.status(500).send({ message: 'An error occurred while saving the data.' });
    }
});

router.get('/data', async (req, res) => {
    try {
        const data = await Data.find();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving data', error });
    }
});

router.patch('/data/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { user, content, toUser, _id, timestamp } = req.body;

    // Proverite da li je ID u ispravnom formatu
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    // Proverite da li svi potrebni podaci postoje
    if (!user || !content || !toUser || !_id || !timestamp) {
        return res.status(400).send({ message: 'User, content, recipient user, ID, or timestamp is missing' });
    }

    try {
        // Pronađi prijatelja po ID-u
        const updatedFriendData = await Data.findById(id);
        if (!updatedFriendData) {
            return res.status(404).send({ message: 'Friend data not found' });
        }

        // Proveri da li poruka već postoji za prijatelja
        const messageExistsForFriend = updatedFriendData.messages.some(m => m._id === _id);
        if (!messageExistsForFriend) {
            updatedFriendData.messages.push({ user, content, toUser, _id, timestamp });
            await updatedFriendData.save();
        }

        // Pronađi korisnika koji je poslao poruku
        const userData = await Data.findOne({ nickname: user });
        if (userData) {
            // Proveri da li poruka već postoji za korisnika
            const messageExistsForUser = userData.messages.some(m => m._id === _id);
            if (!messageExistsForUser) {
                userData.messages.push({ user, content, toUser, _id, timestamp });
                await userData.save();
            }
        }

        // Emituj događaj u realnom vremenu
        io.emit('receiveMessage', { friendData: updatedFriendData, userData }); 

        res.status(200).send({ friendData: updatedFriendData, userData });
    } catch (error) {
        console.error('Error updating data with message:', error.message);
        res.status(500).send({ message: 'Error updating data with message', error });
    }
});



router.delete('/data/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }
    try {
        const deletedData = await Data.findByIdAndDelete(id);
        if (!deletedData) {
            return res.status(404).send({ message: 'Data not found' });
        }
        const imagePath = path.join(__dirname, '../uploads', path.basename(deletedData.image));
        if (deletedData.image && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        res.status(200).send(deletedData);
    } catch (error) {
        res.status(500).send({ message: 'Error deleting data', error });
    }
});

module.exports = router;
