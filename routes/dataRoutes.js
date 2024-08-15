const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect('mongodb+srv://user1:user1@cluster0.gethqff.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define Mongoose schema and model
const messageSchema = new mongoose.Schema({
  user: String,
  content: String,
  timestamp: String,
  toUser: String,
  imageUrl: String, // URL for the image
});

const dataSchema = new mongoose.Schema({
  nickname: String,
  image: String, // User's profile image URL
  messages: [messageSchema],
});

const Data = mongoose.model('Data', dataSchema);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Set upload directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
  },
});

const upload = multer({ storage });

// Routes
app.get('/api/data', async (req, res) => {
  try {
    const data = await Data.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data' });
  }
});

app.patch('/api/data/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, content, timestamp, toUser, imageUrl } = req.body;

    const message = {
      user,
      content,
      timestamp,
      toUser,
      imageUrl: imageUrl || null,
    };

    const updatedData = await Data.findByIdAndUpdate(
      id,
      { $push: { messages: message } },
      { new: true }
    );

    res.json(updatedData);
  } catch (error) {
    res.status(500).json({ message: 'Error updating messages' });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  // Construct the image URL
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
  res.json({ imageUrl });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
