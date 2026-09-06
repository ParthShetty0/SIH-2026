import express from 'express';
import cors from 'cors';
import multer from 'multer';

// 1. Initialize Express
const app = express();
const PORT = 5000;

// 2. Middleware
// Allow incoming requests from other origins (like our React frontend)
app.use(cors());

// Automatically convert incoming JSON request bodies into JavaScript objects
app.use(express.json());

// Configure Multer to keep uploaded files in memory (RAM) as a Buffer
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------------------------------
// ROUTES (The URLs your frontend can call)
// ----------------------------------------------------

// Route 1: Health Check (To verify the server is running)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MediKiosk backend is active!' });
});

// Route 2: Voice Bot Initiation
// Triggered when the user presses "AI Voice Bot"
app.post('/api/voice/start', (req, res) => {
  console.log('Voice Bot button was pressed on the frontend!');

  // Generate a mock session ID to send back to the kiosk
  const newSessionId = 'voice_session_' + Math.floor(Math.random() * 100000);

  res.json({
    success: true,
    sessionId: newSessionId,
    message: 'Voice pipeline is ready for audio streaming.',
  });
});

// Route 3: Prescription OCR
// Triggered when the user uploads a prescription file
// 'prescription' is the key name we will use in FormData on the frontend
app.post('/api/ocr', upload.single('prescription'), (req, res) => {
  // If the user didn't upload a file, return an error
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file received.' });
  }

  console.log(`Received file: ${req.file.originalname}`);
  console.log(`File size: ${req.file.size} bytes`);
  console.log(`MIME type: ${req.file.mimetype}`);

  // Here you will eventually connect Tesseract, OpenAI, or Google Cloud Vision.
  // For now, we return mock medical data to verify everything works:
  res.json({
    success: true,
    fileName: req.file.originalname,
    extractedData: {
      patientName: 'Jane Smith',
      medication: 'Amoxicillin 500mg',
      instructions: 'Take 1 capsule 3 times daily with food',
      doctor: 'Dr. R. Sharma',
    },
  });
});

// 3. Start listening for requests
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(` Backend server is live at http://localhost:${PORT}`);
  console.log(`===========================================`);
});