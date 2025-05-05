/**
 * @license MIT
 * Copyright (c) 2024 RealtimeCjhat
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const OPENAI_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';
const MODEL = 'whisper-1';
const SAMPLE_RATE = 24000;
const PORT = process.env.PORT || 3001;

// Check if API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

wss.on('connection', (client) => {
  // Connect to OpenAI's WebSocket API
  const upstream = new WebSocket(OPENAI_URL, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  // When connected to OpenAI, set up the transcription session
  upstream.on('open', () => {
    try {
      // Configure transcription settings
      upstream.send(JSON.stringify({
        type: 'transcription_session.update',
        session: {
          input_audio_format: 'pcm16',
          input_audio_transcription: {
            model: MODEL,
            language: 'en',
            prompt: 'Transcribe the incoming audio accurately in English.'
          },
          turn_detection: {
            type: 'server_vad',
            silence_duration_ms: 800,
            prefix_padding_ms: 600,
            threshold: 0.5
          }
        }
      }));
    } catch (error) {
      console.error('Error configuring transcription session:', error);
    }
  });

  // Forward audio data from browser to OpenAI
  client.on('message', (data) => {
    try {
      if (upstream.readyState === WebSocket.OPEN) {
        const message = JSON.parse(data);
        
        // Only forward audio data
        if (message.type === 'input_audio_buffer.append') {
          upstream.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: message.audio
          }));
        }
      }
    } catch (error) {
      console.error('Error forwarding audio data:', error);
    }
  });

  // Handle messages from OpenAI
  upstream.on('message', (msg) => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        const data = JSON.parse(msg);
        
        // Process different message types
        switch (data.type) {
          case 'conversation.item.input_audio_transcription.completed':
            // Send completed transcription to client
            if (data.transcript) {
              client.send(JSON.stringify({
                type: 'transcription',
                text: data.transcript,
                isFinal: true
              }));
            }
            break;
            
          case 'input_audio_buffer.speech_started':
            // Update client with speech detection status
            client.send(JSON.stringify({
              type: 'status',
              status: 'speech_started'
            }));
            break;
            
          case 'input_audio_buffer.speech_stopped':
            // Update client when speech ends
            client.send(JSON.stringify({
              type: 'status',
              status: 'speech_stopped'
            }));
            break;
        }
      }
    } catch (error) {
      console.error('Error handling OpenAI message:', error);
    }
  });

  // Error handling for upstream connection
  upstream.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error.message);
  });

  // Error handling for client connection
  client.on('error', (error) => {
    console.error('Client WebSocket error:', error.message);
  });

  // Clean up connections
  const cleanup = () => {
    if (client.readyState === WebSocket.OPEN) client.close();
    if (upstream.readyState === WebSocket.OPEN) upstream.close();
  };

  // Handle connection closures
  upstream.on('close', cleanup);
  client.on('close', cleanup);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 