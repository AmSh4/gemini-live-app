import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

// --- Initialization ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

if (!process.env.GEMINI_API_KEY) {
    console.error("🔴 ERROR: Missing GEMINI_API_KEY in .env file!");
    process.exit(1);
}

app.use(express.static('public'));

// --- WebSocket Connection Logic ---
wss.on('connection', async (ws) => {
    console.log('🟢 Client connected');

    const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
    const model = "gemini-2.5-flash-preview-native-audio-dialog"; // Changed: Use native audio dialog model for better conversational handling and interruptions
    const config = {
        responseModalities: [Modality.AUDIO],
        realtimeInputConfig: { 
            automaticActivityDetection: {
                startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH', // High for faster start detection
                endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH', // Added: High for faster end detection
                prefixPaddingMs: 20, // Changed: Lower for minimal delay in confirming speech start
                silenceDurationMs: 200 // Added: Balanced silence duration for end-of-speech
            }
        },
        systemInstruction: "You are a helpful and friendly voice assistant that only talks about Revolt motors. Respond concisely and stay on topic."
    };

    let session;
    try {
        session = await genAI.live.connect({
            model,
            config,
            callbacks: {
                onopen: () => console.log('Session opened'),
                onmessage: (message) => {
                    let text = '';
                    let audioData = '';
                    if (message.candidates && message.candidates[0] && message.candidates[0].content && message.candidates[0].content.parts && message.candidates[0].content.parts[0].text) {
                        text = message.candidates[0].content.parts[0].text;
                    }
                    if (message.data) {
                        audioData = message.data; // base64 PCM
                    }
                    if (message.server_content && message.server_content.interrupted) {
                        ws.send(JSON.stringify({ type: 'interrupted' }));
                    }
                    if (text) {
                        ws.send(JSON.stringify({ type: 'ai-response', text }));
                    }
                    if (audioData) {
                        ws.send(JSON.stringify({ type: 'ai-audio', data: audioData }));
                    }
                },
                onerror: (e) => {
                    console.error('Error:', e);
                    ws.send(JSON.stringify({ type: 'error', data: e.message }));
                },
                onclose: (e) => console.log('Session closed:', e),
            },
        });
    } catch (error) {
        console.error('Error creating session:', error);
        ws.send(JSON.stringify({ type: 'error', data: error.message }));
        ws.close();
        return;
    }

    ws.on('message', (message) => {
        if (Buffer.isBuffer(message)) {
            const base64 = message.toString('base64');
            session.sendRealtimeInput({
                audio: {
                    data: base64,
                    mimeType: "audio/pcm;rate=16000"
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('🔴 Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});