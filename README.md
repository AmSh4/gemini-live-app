# Gemini Live App

## 📌 Introduction
This project is a **web-based demonstration** of real-time, interruptible voice conversations using the **Google Gemini Live API**.  
It allows users to engage in natural, spoken interactions with an AI assistant focused exclusively on topics related to **Revolt Motors** (an electric vehicle company).  

The core functionality mirrors the interactive experience of sites like **live.revoltmotors.com**, with features such as:

- 🎤 **Real-time Speech-to-Text and Text-to-Speech**: Users speak into their microphone, and the AI responds with synthesized audio.  
- ⏸ **Interruptible Conversations**: Users can interrupt the AI mid-response, handled smoothly via client-side VAD and server-side low-latency detection.  
- 🚲 **Themed AI Responses**: AI only discusses **Revolt Motors**, ensuring concise and on-topic replies.  
- 💡 **UI Feedback**: Status indicators (idle, listening, speaking), transcript display, and a talk button.  

The app uses:
- **Node.js** for the backend  
- **Express** for serving static files  
- **WebSocket** for real-time communication  
- **Google GenAI library** for AI integration  
- **Web Audio API** + **AudioWorklet** for efficient PCM processing  

> ⚠️ **Note**: This project is for development/testing only. For production, monitor API quotas and consider upgrading your Google AI plan.

---

## ⚙️ Requirements
- **Node.js**: Version 18+ (LTS recommended) → [Download](https://nodejs.org/)  
- **Browser**: Chrome/Firefox/Edge with microphone access enabled  
- **Google Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/)  
- **Hardware**: Microphone + speakers/headphones  

---

## 🚀 Setup Instructions

### 1. Install Node.js
If Node.js is not installed:  
- Download and install from [nodejs.org](https://nodejs.org/).  
- Verify installation:

      node --version
      npm --version
      (Example: Node.js v20.x.x and npm v10.x.x)

### 2. Clone or Download the Project

If using Git:

      git clone https://github.com/your-repo/gemini-live-app.git
      cd gemini-live-app


Or manually download files **(index.html, pcm-processor.js, script.js, style.css, .env, package.json, server.js)** and place in a folder.

### 3. Install Dependencies

Navigate to the project root:

    cd gemini-live-app
Install required packages:

    npm install


#### This installs:

- @google/genai
- dotenv
- express
- ws

### 4. Configure Environment Variables

Create a *.env* file in project root:

      GEMINI_API_KEY=your-api-key-here


⚠️ Security Tip: Never commit *.env* to **GitHub**. Add it to *.gitignore*.

### 5. Start the Server

Run:

      npm start

You should see:

      🚀 Server is listening on http://localhost:3000


*Open browser → http://localhost:3000*

6. Grant Microphone Permissions

Allow microphone access when prompted.
If issues → check browser microphone settings.

### 📂 Folder Structure
        gemini-live-app/
        ├── public/                # Static files served by Express
        │   ├── index.html         # Main HTML page with UI
        │   ├── pcm-processor.js   # AudioWorklet processor + VAD
        │   ├── script.js          # Client-side WebSocket/audio/UI logic
        │   └── style.css          # UI styles
        ├── .env                   # API key (ignored in Git)
        ├── package.json           # Project metadata & dependencies
        └── server.js              # Backend with Express, WS, Gemini API

### 🎮 Usage
#### Running the App

a) Start server with *npm start*

b) Visit *http://localhost:3000*

c) UI shows:

- Status indicator (Idle, Listening, Speaking)
- Transcript area
- Start Talking button 🎙️

#### Interacting

- Start: Click "Start Talking" → Speak (e.g., "Tell me about Revolt Motors' latest bike")

- Interrupt: Speak while AI is responding → It stops instantly & listens again

- Stop: Click "Stop Talking"

#### Theming

- AI is restricted to Revolt Motors topics only

### 🛠️ Development Tips

- Model Switching: Default = gemini-2.5-flash-preview-native-audio-dialog.
- For production, use stable model: gemini-2.5-flash-preview.

- Interruptions: Tweak VAD threshold in pcm-processor.js.

- Debugging: Use browser console + quiet environment.

- Customization: Edit systemInstruction in server.js.

### ❗ Troubleshooting

- Quota Exceeded → Regenerate API key or upgrade Google AI plan.

- Microphone Issues → Check browser settings.

- WebSocket Errors → Ensure server is running on port 3000.

- Audio Delay → Check console logs + verify sample rates (16kHz input / 24kHz output).

- Fallback Mode → If AudioWorklet fails, fallback to ScriptProcessorNode (higher latency).

### 🎥 Screen Recording  
- A screen recording of the application in action has been added for better understanding.
  
         https://github.com/AmSh4/gemini-live-app/blob/main/VID-20250825-WA0011.mp4

### 🙌 Credits

- Powered By: Google Gemini Live API

- Libraries: Express, WebSocket (ws), Google GenAI, Web Audio API

- Inspiration: Features from live.revoltmotors.com

  
