import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Apply CORS middleware
app.use(cors());

// Body parser middleware (JSON)
app.use(express.json());

// Example API route
app.get('/api', (req, res) => {
    console.log('API endpoint hit');
    res.json({ message: 'Hello from the API!' });
});

console.log("Hello from Bun!");

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
