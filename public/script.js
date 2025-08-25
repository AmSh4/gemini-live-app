const talkButton = document.getElementById('talk-button');
const statusText = document.getElementById('status-text');
const statusLight = document.getElementById('status-light');
const responseDiv = document.getElementById('response');

let socket;
let isListening = false;
let audioContext;
let audioStream;
let audioProcessorNode;
let outputAudioContext;
let audioQueue = [];
let isPlaying = false;
let currentSource = null;
let nextStartTime = 0;

// --- UI Update Logic ---
function updateStatus(text, lightClass) {
    statusText.textContent = text;
    statusLight.className = lightClass;
}

function updateButton(text, isRecording) {
    document.getElementById('button-text').textContent = text;
    if (isRecording) {
        talkButton.classList.add('recording');
    } else {
        talkButton.classList.remove('recording');
    }
}

// --- Audio Playback Logic ---
async function playNext() {
    if (audioQueue.length === 0) return;

    isPlaying = true;
    updateStatus('Speaking...', 'speaking');

    const int16Array = audioQueue.shift();
    const audioBuffer = outputAudioContext.createBuffer(1, int16Array.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768; // Convert int16 to float32
    }

    currentSource = outputAudioContext.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(outputAudioContext.destination);

    if (nextStartTime <= outputAudioContext.currentTime) {
        nextStartTime = outputAudioContext.currentTime + 0.01; // Small safety buffer for first playback
    }

    currentSource.start(nextStartTime);
    nextStartTime += audioBuffer.duration;

    currentSource.onended = () => {
        isPlaying = false;
        currentSource = null;
        playNext(); // Chain to next if available
        if (audioQueue.length === 0 && isListening) {
            updateStatus('Listening...', 'listening');
        }
    };
}

// --- Microphone Start Helper ---
async function startMic() {
    if (audioStream) return;

    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
    } catch (err) {
        console.error('Microphone error:', err);
        updateStatus('Please allow microphone access.', 'idle');
        return;
    }

    const source = audioContext.createMediaStreamSource(audioStream);

    // Try to use modern AudioWorklet
    try {
        await audioContext.audioWorklet.addModule('/pcm-processor.js');
        audioProcessorNode = new AudioWorkletNode(audioContext, 'pcm-processor');
        console.log('✅ Using modern AudioWorklet processor.');

        audioProcessorNode.port.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) { // PCM audio data
                if (socket?.readyState === WebSocket.OPEN) {
                    socket.send(event.data);
                }
            } else if (event.data.type === 'vad' && event.data.active && isPlaying) { // Client-side VAD detected speech; stop playback instantly
                if (currentSource) {
                    currentSource.stop();
                    currentSource = null;
                }
                audioQueue = [];
                isPlaying = false;
                nextStartTime = 0;
                updateStatus('Listening...', 'listening');
            }
        };
    } catch (e) {
        // Fallback to older ScriptProcessorNode if AudioWorklet fails
        console.warn('⚠ AudioWorklet failed, using fallback ScriptProcessor. Error:', e);
        const bufferSize = 4096;
        audioProcessorNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

        audioProcessorNode.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(pcm16.buffer);
            }
        };
        audioProcessorNode.connect(audioContext.destination);
    }

    source.connect(audioProcessorNode);
}

// --- Core Listening Logic ---
async function startListening() {
    if (isListening) return;

    responseDiv.textContent = '';
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    audioQueue = [];
    isPlaying = false;
    nextStartTime = 0;

    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            await audioContext.resume();
        } catch (e) {
            console.error('Audio context error:', e);
            updateStatus('Browser not supported.', 'idle');
            return;
        }
    }

    if (!outputAudioContext) {
        outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        await outputAudioContext.resume();
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        socket = new WebSocket(`ws://${window.location.host}`);

        socket.onopen = async () => {
            console.log('WebSocket connection opened');
            await startMic();
            isListening = true;
            updateButton('Stop Talking', true);
            updateStatus('Connected. Speak now!', 'listening');
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'ai-response') {
                    responseDiv.textContent += message.text;
                } else if (message.type === 'ai-audio') {
                    const byteCharacters = atob(message.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const int16Array = new Int16Array(byteArray.buffer);
                    audioQueue.push(int16Array);
                    playNext();
                } else if (message.type === 'interrupted') {
                    if (currentSource) {
                        currentSource.stop();
                        currentSource = null;
                    }
                    audioQueue = [];
                    isPlaying = false;
                    nextStartTime = 0;
                    updateStatus('Listening...', 'listening');
                } else if (message.type === 'error') {
                    console.error('Server error:', message.data);
                    updateStatus(`Error: ${message.data}`, 'idle');
                }
            } catch (e) {
                console.error('Failed to process message from server:', e, event.data);
            }
        };

        socket.onclose = () => {
            console.log('WebSocket closed');
            stopListening(false);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus('Connection error.', 'idle');
            stopListening(false);
        };
    } else {
        await startMic();
        isListening = true;
        updateButton('Stop Talking', true);
        updateStatus('Connected. Speak now!', 'listening');
    }
}

function stopListening(shouldCloseSocket = true) {
    if (!isListening) return;
    isListening = false;

    updateButton('Start Talking', false);
    updateStatus('Click the button to start talking', 'idle');

    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    audioQueue = [];
    isPlaying = false;
    nextStartTime = 0;

    audioStream?.getTracks().forEach(track => track.stop());
    audioStream = null;
    audioProcessorNode?.disconnect();

    if (socket && shouldCloseSocket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
}

talkButton.addEventListener('click', () => {
    if (!isListening) {
        startListening();
    } else {
        stopListening();
    }
});