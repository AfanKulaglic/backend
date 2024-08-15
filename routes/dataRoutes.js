const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const io = require('socket.io')(3000); // Ensure the same socket instance is used

// Define Data Schema and Model
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
            user: String,
            content: String,
            timestamp: { type: Date, default: Date.now },
            toUser: String,
            _id: { type: String, default: () => new Date().toISOString() } // Ensure unique ID for messages
        }
    ]
});

const Data = mongoose.model('Data', DataSchema);

// Define routes
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }
    if (!user || !content || !toUser || !_id || !timestamp) {
        return res.status(400).send({ message: 'User, content, recipient user, ID, or timestamp is missing' });
    }
    try {
        const updatedFriendData = await Data.findById(id);
        if (!updatedFriendData) {
            return res.status(404).send({ message: 'Friend data not found' });
        }

        // Check if the message already exists
        const messageExists = updatedFriendData.messages.some(m => m._id === _id);
        if (!messageExists) {
            updatedFriendData.messages.push({ user, content, toUser, _id, timestamp });
            await updatedFriendData.save();

            const userData = await Data.findOne({ nickname: toUser });
            if (userData) {
                // Send the message to the recipient
                const recipientMessageExists = userData.messages.some(m => m._id === _id);
                if (!recipientMessageExists) {
                    userData.messages.push({ user, content, toUser: userData.nickname, _id, timestamp });
                    await userData.save();
                }
            }

            io.emit('newMessage', { friendData: updatedFriendData, userData });
            res.status(200).send({ friendData: updatedFriendData, userData });
        } else {
            res.status(200).send({ friendData: updatedFriendData, userData: null });
        }
    } catch (error) {
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
