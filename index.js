require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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

// Data Schema
const DataSchema = new Schema({
    field1: String,
    field2: String,
});

const Data = mongoose.model('Data', DataSchema);

// User Schema
const UserSchema = new Schema({
    username: String,
    password: String,
});

const User = mongoose.model('User', UserSchema);

// Middleware za provjeru JWT tokena
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// API Ruta za registraciju
app.post('/api/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({
            username: req.body.username,
            password: hashedPassword,
        });
        await newUser.save();
        res.status(201).send({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Error registering user', error });
    }
});

// API Ruta za login
app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(400).send({ message: 'Cannot find user' });

    try {
        if (await bcrypt.compare(req.body.password, user.password)) {
            const userId = { id: user._id };
            const token = jwt.sign(userId, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.status(200).send({ message: 'Login successful', token });
        } else {
            res.status(403).send({ message: 'Invalid password' });
        }
    } catch {
        res.status(500).send({ message: 'Error logging in' });
    }
});

// API Ruta za dodavanje podataka (zaštićena autentifikacijom)
app.post('/api/data', authenticateToken, async (req, res) => {
    const newData = new Data(req.body);
    try {
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        res.status(400).send(error);
    }
});

// API Ruta za čitanje podataka (zaštićena autentifikacijom)
app.get('/api/data', authenticateToken, async (req, res) => {
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

// API Ruta za brisanje podataka (zaštićena autentifikacijom)
app.delete('/api/data/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ message: 'Invalid ID format' });
    }

    try {
        const deletedData = await Data.findByIdAndDelete(id);
        if (!deletedData) {
            return res.status(404).send({ message: 'Data not found' });
        }
        res.status(200).send(deletedData);
    } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
