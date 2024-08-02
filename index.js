require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(bodyParser.json());
app.use(cors());

const dbUri = process.env.MONGODB_URI;

mongoose.connect(dbUri)
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });

const Schema = mongoose.Schema;
const DataSchema = new Schema({
    field1: String,
    field2: String,
});

const Data = mongoose.model('Data', DataSchema);

app.post('/api/data', async (req, res) => {
    const newData = new Data(req.body);
    try {
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.get('/api/data', async (req, res) => {
    try {
        const data = await Data.find();
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
