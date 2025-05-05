// Audio context and stream variables
let audioContext;
let mediaStream;
let workletNode;
let socket;
let isRecording = false;

// WebSocket reconnection settings
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000; // 2 seconds

// Get DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const transcript = document.getElementById('transcript');
const status = document.getElementById('status');

// Add event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

// Initialize WebSocket connection
async function initializeWebSocket() {
  try {
    socket = new WebSocket(`ws://${window.location.hostname}:3000`);

    socket.onopen = () => {
      status.textContent = 'Connected and recording';
      isRecording = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      reconnectAttempts = 0;
    };

    socket.onclose = (event) => {
      status.textContent = `Connection closed (Code: ${event.code})`;
      isRecording = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;

      // Attempt to reconnect if not intentionally stopped
      if (isRecording && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        status.textContent = `Connection lost. Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`;
        setTimeout(initializeWebSocket, RECONNECT_DELAY);
      }
    };

    socket.onerror = () => {
      status.textContent = 'Connection error';
    };

    // Handle incoming messages from server
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (!data.type) return;

        switch (data.type) {
          case 'transcription':
            // Handle transcription updates
            if (data.text) {
              if (data.isFinal) {
                // For final transcriptions, append with a newline
                transcript.textContent += data.text;
                transcript.scrollTop = transcript.scrollHeight;
              } else {
                // For partial transcriptions, update the last line
                const lines = transcript.textContent.split('\n');
                lines[lines.length - 1] = data.text;
                transcript.textContent = lines.join('\n');
                transcript.scrollTop = transcript.scrollHeight;
              }
            }
            break;

          case 'status':
            // Update status indicators
            if (data.status === 'speech_started') {
              status.textContent = 'Listening...';
              status.style.color = 'green';
            } else if (data.status === 'speech_stopped') {
              status.textContent = 'Processing...';
              status.style.color = 'orange';
            }
            break;

          case 'error':
            status.textContent = `Error: ${data.error || 'Unknown error'}`;
            break;
        }
      } catch (error) {
        status.textContent = 'Error processing server message';
      }
    };
  } catch (error) {
    status.textContent = 'Error: Could not initialize WebSocket connection';
  }
}

// Start recording audio
async function startRecording() {
  try {
    status.textContent = 'Initializing...';
    
    // Initialize audio context with correct sample rate
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000
    });
    
    // Request microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000
      }
    });

    // Load and initialize the PCM processor
    await audioContext.audioWorklet.addModule('pcm-processor.js');
    const source = audioContext.createMediaStreamSource(mediaStream);
    workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
    
    // Connect audio nodes
    source.connect(workletNode).connect(audioContext.destination);

    // Initialize WebSocket connection
    await initializeWebSocket();

    // Handle audio data from processor
    let audioBufferQueue = new Int16Array(0);
    workletNode.port.onmessage = (event) => {
      try {
        if (socket && socket.readyState === WebSocket.OPEN) {
          const currentBuffer = new Int16Array(event.data.audio_data);
          
          // Merge with existing buffer
          audioBufferQueue = mergeBuffers(audioBufferQueue, currentBuffer);
          
          // Send audio data in 100ms chunks
          const bufferDuration = (audioBufferQueue.length / audioContext.sampleRate) * 1000;
          if (bufferDuration >= 100) {
            const samplesFor100ms = Math.floor(audioContext.sampleRate * 0.1);
            const dataToSend = audioBufferQueue.subarray(0, samplesFor100ms);
            
            // Update buffer queue
            audioBufferQueue = audioBufferQueue.subarray(samplesFor100ms);
            
            // Send audio data
            socket.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encodeInt16ArrayToBase64(dataToSend)
            }));
          }
        }
      } catch (error) {
        status.textContent = 'Error processing audio data';
      }
    };

  } catch (error) {
    if (error.name === 'NotAllowedError') {
      status.textContent = 'Error: Microphone access denied. Please allow microphone access and try again.';
    } else {
      status.textContent = 'Error: ' + error.message;
    }
  }
}

// Merge two audio buffers
function mergeBuffers(buffer1, buffer2) {
  const merged = new Int16Array(buffer1.length + buffer2.length);
  merged.set(buffer1, 0);
  merged.set(buffer2, buffer1.length);
  return merged;
}

// Convert audio buffer to base64
function encodeInt16ArrayToBase64(int16Array) {
  const bytes = new Uint8Array(int16Array.buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

// Stop recording
function stopRecording() {
  isRecording = false;
  
  // Stop all media tracks
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
  
  // Close audio context
  if (audioContext) {
    audioContext.close();
  }
  
  // Close WebSocket connection
  if (socket) {
    socket.close();
  }
  
  // Update UI
  startBtn.disabled = false;
  stopBtn.disabled = true;
  status.textContent = 'Recording stopped';
} 