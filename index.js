require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(bodyParser.json());
app.use(cors());

// MongoDB Connection
const dbUri = process.env.MONGODB_URI;

mongoose.connect(dbUri)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Define Schemas and Models
const Schema = mongoose.Schema;

const DataSchema = new Schema({
    nickname: String,
    image: String, // URL of the image
});

const Data = mongoose.model('Data', DataSchema);

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

// Data Routes
app.post('/api/data', async (req, res) => {
    try {
        const { nickname, image } = req.body;

        if (!nickname || !image) {
            return res.status(400).send({ message: 'Nickname or image URL is missing' });
        }

        // `image` is the URL in this case
        const newData = new Data({ nickname, image });
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        console.error('Error saving nickname or image:', error.message);
        res.status(500).send({ message: 'An error occurred while saving the nickname or image.' });
    }
});

app.get('/api/data', async (req, res) => {
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

app.delete('/api/data/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    try {
        const deletedData = await Data.findByIdAndDelete(id);
        if (!deletedData) {
            return res.status(404).send({ message: 'Data not found' });
        }

        // Optionally delete the associated image file if stored locally
        if (deletedData.image && fs.existsSync(path.join(__dirname, 'uploads', deletedData.image.split('/').pop()))) {
            fs.unlinkSync(path.join(__dirname, 'uploads', deletedData.image.split('/').pop()));
        }

        res.status(200).send(deletedData);
    } catch (error) {
        res.status(500).send({ message: 'Error deleting data', error });
    }
});

// Authentication Routes
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).send({ message: 'User registered' });
    } catch (error) {
        res.status(400).send({ message: 'Error registering user', error });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).send({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.send({ token });
    } catch (error) {
        res.status(500).send({ message: 'Error logging in', error });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
