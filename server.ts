import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Server-side Gemini AI setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API route for AI Physics Tutor
app.post('/api/gemini/explain', async (req, res) => {
  try {
    const { prompt, labState } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemInstruction = `You are the AI Physics & Chemistry Lab Coach for Electrostatics Studio. 
You explain electrostatic phenomena with extreme physical precision, clarity, and educational encouragement.
Context: You are analyzing a 2D physics simulation where students study triboelectric friction charging, electron work functions, Coulomb force vectors, electric field lines E(x,y), potential V(x,y), and dielectric polarization.

Always reference real physics concepts when relevant:
- Triboelectric affinity & work function difference ΔW = W_A - W_B
- Electron transfer vs proton retention
- Inverse square Coulomb law F = k * q1 * q2 / r^2
- Dipole induction in neutral dielectrics (paper bits, balloons on walls)
- Gauss's Law & Equipotential surfaces
- Conduction, grounding, and charge equalization

Keep answers structured, concise (2-4 readable paragraphs), with bullet points or formatted formulas where appropriate. Format with clean Markdown.`;

    const userContent = `Simulation State Summary:
${JSON.stringify(labState || {}, null, 2)}

Student Question / Request:
"${prompt}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userContent,
      config: {
        systemInstruction,
      },
    });

    return res.json({ explanation: response.text ?? 'No explanation generated.' });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI physics explanation.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'custom',
    });
    
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const template = await vite.transformIndexHtml(url, rawTemplate);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Electrostatics Studio running on http://localhost:${PORT}`);
  });
}

startServer();
