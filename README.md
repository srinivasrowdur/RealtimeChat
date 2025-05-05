# Real-time Audio Transcription

A web application that provides real-time audio transcription using OpenAI's Whisper model. The application captures audio from the user's microphone and transcribes it in real-time.

## Features

- Real-time audio capture from microphone
- Live transcription using OpenAI's Whisper model
- Speech detection with automatic start/stop
- WebSocket-based communication for low latency
- Clean and intuitive user interface
- Automatic reconnection handling

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API key
- Modern web browser with Web Audio API support

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd RealtimeCjhat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

## Usage

1. Start the server:
```bash
node server.js
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Click the "Start Recording" button to begin transcription
4. Speak into your microphone
5. View the real-time transcription in the text area
6. Click "Stop Recording" when finished

## Technical Details

- Frontend: Vanilla JavaScript with Web Audio API
- Backend: Node.js with Express and WebSocket
- Audio Processing: PCM audio processing with AudioWorklet
- Transcription: OpenAI Whisper model via WebSocket API
- Sample Rate: 24kHz
- Audio Format: PCM16

## Project Structure

```
RealtimeCjhat/
├── public/
│   ├── index.html
│   ├── main.js
│   └── pcm-processor.js
├── server.js
├── .env
├── .gitignore
└── README.md
```

## Error Handling

The application includes comprehensive error handling for:
- Microphone access issues
- WebSocket connection problems
- Audio processing errors
- Transcription failures

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 