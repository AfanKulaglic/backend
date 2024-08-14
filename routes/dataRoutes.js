const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const router = express.Router();
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
    const { user, content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    if (!user || !content) {
        return res.status(400).send({ message: 'User or content is missing' });
    }

    try {
        const updatedData = await Data.findByIdAndUpdate(
            id,
            { $push: { messages: { user, content } } },
            { new: true }
        );

        if (!updatedData) {
            return res.status(404).send({ message: 'Data not found' });
        }

        // Broadcast the update to all connected WebSocket clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(updatedData));
            }
        });

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

// Start the WebSocket server
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

module.exports = router;
