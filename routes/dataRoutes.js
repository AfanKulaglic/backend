const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const router = express.Router();

// Postojeći kod za definiranje sheme i ruta...
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

        const messageExistsForFriend = updatedFriendData.messages.some(m => m._id === _id);
        if (!messageExistsForFriend) {
            updatedFriendData.messages.push({ user, content, toUser, _id, timestamp });
            await updatedFriendData.save();
        }

        const userData = await Data.findOne({ nickname: user });
        if (userData) {
            const messageExistsForUser = userData.messages.some(m => m._id === _id);
            if (!messageExistsForUser) {
                userData.messages.push({ user, content, toUser: userData.nickname, _id, timestamp });
                await userData.save();
            }
        }

        io.emit('newMessage', { friendData: updatedFriendData, userData });
        res.status(200).send({ friendData: updatedFriendData, userData });
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

// Novi kod za upload i ažuriranje slike
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

router.patch('/data/:id/image', upload.single('image'), async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    try {
        const userData = await Data.findById(id);
        if (!userData) {
            return res.status(404).send({ message: 'User not found' });
        }

        if (userData.image) {
            const oldImagePath = path.join(__dirname, '../uploads', path.basename(userData.image));
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        userData.image = `/uploads/${req.file.filename}`;
        await userData.save();

        res.status(200).send(userData);
    } catch (error) {
        res.status(500).send({ message: 'Error updating image', error });
    }
});

module.exports = router;
