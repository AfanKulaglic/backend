const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const router = express.Router();

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

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
            seen: { type: Boolean, default: false }
        }
    ]
});

const Data = mongoose.model('Data', DataSchema);

// Route to create new data
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

// Route to get all data
router.get('/data', async (req, res) => {
    try {
        const data = await Data.find();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving data', error });
    }
});

// Route to update a user's messages
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

        const messageExistsForFriend = updatedFriendData.messages.find(m => m._id === _id);
        if (messageExistsForFriend) {
            messageExistsForFriend.seen = true;
        } else {
            updatedFriendData.messages.push({ user, content, toUser, _id, timestamp });
        }
        await updatedFriendData.save();

        const userData = await Data.findOne({ nickname: user });
        if (userData) {
            const messageExistsForUser = userData.messages.find(m => m._id === _id);
            if (!messageExistsForUser) {
                userData.messages.push({ user, content, toUser, _id, timestamp });
                await userData.save();
            }
        }

        io.emit('newMessage', { friendData: updatedFriendData, userData });
        res.status(200).send({ friendData: updatedFriendData, userData });
    } catch (error) {
        res.status(500).send({ message: 'Error updating data with message', error });
    }
});

// Route to mark messages as seen
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

// Route to delete data
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

// Route to update user image
router.patch('/data/:id/updateImage', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    try {
        const data = await Data.findById(id);
        if (!data) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Delete old image if exists
        if (data.image) {
            const oldImagePath = path.join(__dirname, '../uploads', path.basename(data.image));
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update with new image
        const newImagePath = `/uploads/${req.file.filename}`;
        data.image = newImagePath;
        await data.save();

        res.status(200).send({ image: newImagePath });
    } catch (error) {
        res.status(500).send({ message: 'Error updating image', error });
    }
});

module.exports = router;
