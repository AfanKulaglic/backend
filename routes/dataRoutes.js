const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Define Data Schema and Model
const DataSchema = new mongoose.Schema({
    nickname: String,
    image: String, // URL of the image
});

const Data = mongoose.model('Data', DataSchema);

// POST new data
router.post('/data', async (req, res) => {
    try {
        const { nickname, image } = req.body;

        if (!nickname || !image) {
            return res.status(400).send({ message: 'Nickname or image URL is missing' });
        }

        const newData = new Data({ nickname, image });
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        console.error('Error saving nickname or image:', error.message);
        res.status(500).send({ message: 'An error occurred while saving the nickname or image.' });
    }
});

// GET all data
router.get('/data', async (req, res) => {
    try {
        const data = await Data.find();
        if (data.length === 0) {
            const defaultData = [
                { nickname: 'guest1123' },
            ];
            return res.status(200).send(defaultData);
        }
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ message: 'Error retrieving data', error });
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

        if (deletedData.image && fs.existsSync(path.join(__dirname, '../uploads', deletedData.image.split('/').pop()))) {
            fs.unlinkSync(path.join(__dirname, '../uploads', deletedData.image.split('/').pop()));
        }

        res.status(200).send(deletedData);
    } catch (error) {
        res.status(500).send({ message: 'Error deleting data', error });
    }
});

module.exports = router;
