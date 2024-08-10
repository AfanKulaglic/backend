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
    image: String, // Path to the stored image file
});

const Data = mongoose.model('Data', DataSchema);

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Store uploads in the 'uploads' directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Name the file with a timestamp
    }
});

const upload = multer({ storage: storage });

// Data Routes
app.post('/api/data', async (req, res) => {
    try {
        const { nickname, image } = req.body;

        if (!nickname || !image) {
            return res.status(400).send({ message: 'Nickname or image is missing' });
        }

        // Decode Base64 image string and save the file
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imagePath = path.join(__dirname, 'uploads', `${Date.now()}.png`);

        fs.writeFileSync(imagePath, imageBuffer);

        const newData = new Data({ nickname, image: imagePath });
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).send({ message: 'Error saving data', error: error.message });
    }
});



app.get('/api/data', async (req, res) => {
    try {
        const data = await Data.find();
        if (data.length === 0) {
            const defaultData = [
                { nickname: 'Default Field 1 - 1' },
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

        // Delete the associated image file if it exists
        if (deletedData.image) {
            fs.unlink(path.join(__dirname, 'uploads', deletedData.image), (err) => {
                if (err) console.error('Error deleting image file:', err);
            });
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
