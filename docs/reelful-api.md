# Reelful - AI-Powered Social Media Content Generator

Reelful is an API that uses AI to create professional social media content. It generates scripts, animated videos from images, and voiceovers for Instagram Reels, TikTok, and YouTube Shorts.

## Features

- 🎬 **Video Generation**: Convert static images into 3-second animated videos using fal AI
- 🎙️ **Voiceover Creation**: Generate professional audio narration using ElevenLabs
- 🎵 **Background Music**: AI-generated music that matches voiceover duration with multiple styles
- ✍️ **Script Writing**: AI-powered script generation optimized for short-form content
- 🤖 **Intelligent Agent**: Uses Dedalus AI with automatic tool execution
- 📤 **Media Upload**: Support for uploading and processing local media files

## Quick Start

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd reelful

# Install dependencies
pip install -r requirements.txt
```

### Configuration

Create a `.env` file with your API keys:

```bash
DEDALUS_API_KEY=your_dedalus_key
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_MUSIC_API_KEY=your_elevenlabs_music_key  # Optional
FAL_KEY=your_fal_key
```

### Running the Server

```bash
python run.py
```

The API will be available at `http://localhost:8000`

## Usage

### Basic Example

```python
import requests

# Generate content
response = requests.post("http://localhost:8000/chat", json={
    "message": "Create a reel about AI innovation",
    "model": "openai/gpt-5",
    "image_urls": ["https://example.com/image.jpg"]
})

result = response.json()
print(f"Script: {result['script']}")
print(f"Audio: {result['audio_path']}")
print(f"Music: {result['music_path']}")
print(f"Videos: {result['video_paths']}")
```

### With File Upload

```bash
# Upload images
curl -X POST "http://localhost:8000/upload-media" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"

# Use uploaded images
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create an engaging reel",
    "image_urls": [
      "http://localhost:8000/media/uuid1.jpg"
    ]
  }'
```

## API Endpoints

- `POST /chat` - Generate content with AI agent
- `POST /upload-media` - Upload local media files
- `GET /media/{filename}` - Retrieve media files
- `GET /` - Health check

For detailed API documentation, see [API_USAGE.md](API_USAGE.md)

## How It Works

1. **Input**: You provide a prompt and optional image URLs
2. **Script Generation**: AI generates a professional 15-second script
3. **Video Creation**: Images are animated into 3-second videos (auto-trimmed from 5s)
4. **Voiceover**: AI generates audio narration from the script
5. **Background Music**: AI generates music matching the voiceover duration
6. **Output**: Returns script, video paths, audio path, and music path

## Technologies

- **FastAPI**: Modern web framework for the API
- **Dedalus**: AI agent orchestration with tool execution
- **fal AI**: Image-to-video generation (Kling Video v2.5)
- **ElevenLabs**: Text-to-speech for voiceovers and AI music generation
- **MoviePy**: Video processing and trimming
- **Pydub**: Audio duration detection

## Testing

Run the test suite:

```bash
python test_video_generation.py
```

## Project Structure

```
reelful/
├── main.py              # Main API application
├── run.py               # Server startup script
├── api.py               # API configuration
├── requirements.txt     # Python dependencies
├── vercel.json         # Vercel deployment config
├── uploads/            # Uploaded media files
├── outputs/            # Generated media files
├── API_USAGE.md        # Detailed API documentation
└── test_video_generation.py  # Test suite
```

## Deployment

### Vercel

The project is configured for Vercel deployment:

```bash
vercel deploy
```

## Notes

- Videos are automatically trimmed from 5 seconds to 3 seconds
- The agent uses `auto_execute_tools=True` for seamless tool execution
- Generated files are stored in `outputs/` directory
- Uploaded files are stored in `uploads/` directory

## License

[Your License Here]