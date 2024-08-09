require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const dbUri = process.env.MONGODB_URI;
mongoose.connect(dbUri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.matchPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);

const DataSchema = new Schema({
    field1: String,
    field2: String,
});

const Data = mongoose.model('Data', DataSchema);

// Middleware za verifikaciju JWT tokena
const protect = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// Registracija korisnika
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = new User({ username, password });
        await user.save();
        res.status(201).send({ message: 'User registered' });
    } catch (error) {
        res.status(400).send(error);
    }
});

// Prijava korisnika
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).send({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).send({ token });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Zaštićena ruta za pristup podacima
app.get('/api/data', protect, async (req, res) => {
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

app.post('/api/data', protect, async (req, res) => {
    const newData = new Data(req.body);
    try {
        await newData.save();
        res.status(201).send(newData);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.delete('/api/data/:id', protect, async (req, res) => {
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
