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
            seen: { type: Boolean, default: false }  // Add this line
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
    const { user, _id, toUser } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }
    if (!user || !_id || !toUser) {
        return res.status(400).send({ message: 'User, ID, or recipient user is missing' });
    }

    try {
        const friendData = await Data.findById(id);
        if (!friendData) {
            return res.status(404).send({ message: 'Friend data not found' });
        }

        // Ažurirajte status za prijatelja
        friendData.messages.forEach(message => {
            if (message._id === _id) {
                message.seen = true;
            }
        });
        await friendData.save();

        const userData = await Data.findOne({ nickname: user });
        if (userData) {
            // Ažurirajte status za korisnika
            userData.messages.forEach(message => {
                if (message._id === _id) {
                    message.seen = true;
                }
            });
            await userData.save();
        }

        // Emitujte događaj za ažurirane podatke
        io.emit('updateMessages', { friendData, userData });

        res.status(200).send({ friendData, userData });
    } catch (error) {
        res.status(500).send({ message: 'Error updating data with message', error });
    }
});



router.patch('/data/:id/markAsSeen', async (req, res) => {
    const { id } = req.params;
    const { user } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }
    if (!user) {
        return res.status(400).send({ message: 'User is missing' });
    }

    try {
        const chatData = await Data.findById(id);
        if (!chatData) {
            return res.status(404).send({ message: 'Chat data not found' });
        }

        chatData.messages.forEach(msg => {
            if (msg.toUser === user) {
                msg.seen = true;
            }
        });

        await chatData.save();
        res.status(200).send(chatData);
    } catch (error) {
        res.status(500).send({ message: 'Error marking messages as seen', error });
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
