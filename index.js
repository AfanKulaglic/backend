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
        if (data.length === 0) {
            const defaultData = [
                { field1: 'Default Field 1 - 1', field2: 'Default Field 2 - 1' },
                { field1: 'Default Field 1 - 2', field2: 'Default Field 2 - 2' },
            ];
            return res.status(200).send(defaultData);
        }
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete('/api/data/:id', async (req, res) => {
    const { id } = req.params;

    console.log(`Received request to delete item with ID: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error(`Invalid ObjectId format: ${id}`);
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    try {
        const deletedData = await Data.findByIdAndDelete(id);

        if (!deletedData) {
            console.error(`Item with ID: ${id} not found`);
            return res.status(404).send({ message: 'Data not found' });
        }

        console.log(`Item with ID: ${id} successfully deleted`);
        return res.status(200).send(deletedData);
    } catch (error) {
        console.error('Error deleting data:', error);
        return res.status(500).send({ message: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
