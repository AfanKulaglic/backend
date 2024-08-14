const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const router = express.Router();

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
            timestamp: { type: Date, default: Date.now }
        }
    ]
});

const Data = mongoose.model('Data', DataSchema);

// POST new data
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

// GET all data
router.get('/data', async (req, res) => {
    try {
        const data = await Data.find();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving data', error });
    }
});

// PATCH data by ID to add a message
router.patch('/data/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { user, content, senderUsername } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    if (!user || !content || !senderUsername) {
        return res.status(400).send({ message: 'User, content, or senderUsername is missing' });
    }

    try {
        const updatedData = await Data.findByIdAndUpdate(
            id,
            { $push: { messages: { user, content, senderUsername } } },
            { new: true }
        );

        if (!updatedData) {
            return res.status(404).send({ message: 'Data not found' });
        }

        res.status(200).send(updatedData);
    } catch (error) {
        res.status(500).send({ message: 'Error updating data with message', error });
    }
});

// DELETE data by ID
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

        // Remove the image file if it exists
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
