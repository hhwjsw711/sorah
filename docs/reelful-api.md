# Reelful API Usage Guide

## Overview

The Reelful API uses the Dedalus AI agent to create social media video scripts, generate videos from images, and create voiceovers. The agent has access to tools that can:

1. Generate animated videos from images using fal AI (automatically trimmed to 3 seconds)
2. Generate voiceover audio from text using ElevenLabs
3. Create professional social media scripts

## Setup

### Environment Variables

Create a .env file with the following keys:


DEDALUS_API_KEY=your_dedalus_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_MUSIC_API_KEY=your_elevenlabs_music_key  # Optional, falls back to ELEVENLABS_API_KEY
FAL_KEY=your_fal_key


### Install Dependencies


pip install -r requirements.txt


## API Endpoints

### 1. POST /chat - Main Endpoint

Send a message with optional images to generate a script, videos, and audio.

Request Body:

{
  "message": "Create a social media reel about our new product launch",
  "model": "openai/gpt-5",
  "image_urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}


Response:

{
  "script": "Generated script text...",
  "audio_path": "/media/audio_12345.mp3",
  "music_path": "/media/music_67890.mp3",
  "video_paths": [
    "/media/video_abc123.mp4",
    "/media/video_def456.mp4"
  ],
  "error": null
}


How it Works:
1. The agent receives your message and image URLs
2. It generates a 15-second script optimized for IG/TikTok/YouTube Shorts
3. The agent automatically calls tools to:
   - Generate 3-second animated videos from each image (using fal AI)
   - Generate voiceover audio from the script (using ElevenLabs)
   - Generate background music matching the voiceover duration (using ElevenLabs Music)
4. Returns the script and paths to generated media files

### 2. POST /upload-media - Upload Local Files

Upload local images/videos to get URLs that can be used with the /chat endpoint.

Request:

curl -X POST "http://localhost:8000/upload-media" \
  -F "files=@image1.jpg" \
  -F "files=@image2.png"


Response:

{
  "urls": [
    "/media/uuid1.jpg",
    "/media/uuid2.png"
  ],
  "count": 2
}


### 3. GET /media/{filename} - Retrieve Media Files

Access uploaded or generated media files.

Example:

GET http://localhost:8000/media/video_abc123.mp4


## Example Workflow

### Step 1: Upload Images (Optional)

If you have local images, upload them first:


curl -X POST "http://localhost:8000/upload-media" \
  -F "files=@product_photo.jpg" \
  -F "files=@team_photo.jpg"


Response:

{
  "urls": [
    "/media/abc123.jpg",
    "/media/def456.jpg"
  ],
  "count": 2
}


### Step 2: Generate Content

Use the /chat endpoint with your images:


curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create an engaging reel about our innovative AI-powered product that helps businesses automate their workflows. Target tech-savvy entrepreneurs.",
    "model": "openai/gpt-5",
    "image_urls": [
      "http://localhost:8000/media/abc123.jpg",
      "http://localhost:8000/media/def456.jpg"
    ]
  }'


Response:

{
  "script": "Ever wonder how top businesses save 10 hours a week? Meet FlowAI, the game-changing automation platform...",
  "audio_path": "/media/audio_xyz789.mp3",
  "video_paths": [
    "/media/video_video1.mp4",
    "/media/video_video2.mp4"
  ],
  "error": null
}


### Step 3: Download Generated Media

Access your generated files:
- Audio: http://localhost:8000/media/audio_xyz789.mp3
- Videos: 
  - http://localhost:8000/media/video_video1.mp4
  - http://localhost:8000/media/video_video2.mp4

## Agent Tools

The Dedalus agent has access to these tools:

### 1. generate_video_from_image(image_url, prompt)

Generates a 3-second animated video from an image using fal AI.

- Input: Image URL and animation prompt
- Output: Video file path (automatically trimmed to 3 seconds)
- Note: Original fal API returns 5-second videos, which are automatically trimmed

### 2. generate_audio(text, output_file)

Generates professional voiceover audio from text using ElevenLabs.

- Input: Text to convert to speech
- Output: Audio file path (.mp3) and duration in milliseconds
- Voice: Professional voice optimized for social media

### 3. generate_music(duration_ms, style)

Generates background music using ElevenLabs Music API.

- Input: 
  - duration_ms: Duration in milliseconds (automatically matches voiceover length)
  - style: Music style - "auto" (random), "funky", "electronic", "lofi", "cinematic", or "acoustic"
- Output: Music file path (.mp3)
- Styles:
  - funky: Funky jam session, improv jazz, modern
  - electronic: Upbeat electronic groove, synthwave vibes, energetic
  - lofi: Chill lo-fi beat, mellow hip-hop, rainy afternoon
  - cinematic: Cinematic score, orchestral build-up, inspiring
  - acoustic: Acoustic indie pop, warm guitar strums, nostalgic

## Running the API

### Development


python run.py


### Production (Vercel)

The API is configured for Vercel deployment. See vercel.json for configuration.

## Notes

- Videos are automatically trimmed from 5 seconds to 3 seconds
- The agent uses auto_execute_tools=True, so it will automatically call the necessary tools
- All generated files are stored in the outputs/ directory
- Uploaded files are stored in the uploads/ directory
- The system prompt is optimized for creating engaging 15-second social media content

## System Prompt

The agent is configured with a specialized prompt for social media content creation:

> "You are a social media manager creating a script for a short form video for IG, TikTok or YouTube shorts. Your task is to create a 15 second script given the given information. Add a bit of background to explain company names, if some details can be lacking for general audience, feel free to add it. Also add value why this reel is worth watch or why the idea conveyed in the reel is important. Add a hook in the beginning and call for action at the end related to the things mentioned at the video (to try the thing mentioned or smth like that). Do not add too much exciting phrases - try to keep professional. Take into account the photos and videos attached. The output should be just plain text w/o any additional words."

## Troubleshooting

### Missing API Keys

If you get errors about missing API keys, ensure all required keys are in your .env file:
- DEDALUS_API_KEY
- ELEVENLABS_API_KEY
- ELEVENLABS_MUSIC_API_KEY (optional, falls back to `ELEVENLABS_API_KEY`)
- FAL_KEY

### Video Generation Issues

- Ensure the fal API key is valid
- Image URLs must be publicly accessible
- The fal API may take some time to generate videos (up to 30+ seconds)

### Audio Generation Issues

- Verify the ElevenLabs API key
- Check that you have sufficient credits in your ElevenLabs account
- The voice ID is hardcoded to y3QRUmmVlCstT6DNbXg9