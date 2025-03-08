from flask import Flask, request, send_file
import speech_recognition as sr
from transformers import AutoModelForCausalLM, AutoTokenizer
import subprocess
from flask_cors import CORS
from pydub import AudioSegment
import os

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173'])
avatar_name = None
avatar_context = None

# Load DialoGPT model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-small")
model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-small")

@app.route("/set-avatar", methods=["POST"])
def setAvatar():
    global avatar_name, avatar_context
    data = request.get_json()
    avatar_name = data["name"]
    avatar_context = data["context"]
    return "Avatar set successfully"

def speech_to_text(audio_file):
    r = sr.Recognizer()
    with sr.AudioFile(audio_file) as source:  # Changed from sr.WaveFile to sr.AudioFile
        audio = r.record(source)
    try:
        text = r.recognize_sphinx(audio)
        return text
    except sr.UnknownValueError:
        return "Sorry, I didn't understand that."

def generate_response(user_input, context):
    prompt = f"Assistant is {context}. User: {user_input} Assistant:"
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(inputs["input_ids"], max_length=100, pad_token_id=tokenizer.eos_token_id)
    response = tokenizer.decode(outputs[0][len(inputs["input_ids"]):], skip_special_tokens=True)
    return response

def text_to_speech(text, output_file):
    subprocess.run(["espeak", "-v", "en-us", "-w", output_file, text])

@app.route("/process-audio", methods=["POST"])
def processAudio():
    # Get the audio file from the request
    audio_file = request.files["audio"]
    input_path = "input.webm"  # Save as WebM initially, assuming react-media-recorder default
    audio_file.save(input_path)
    
    # Convert WebM to WAV using pydub
    wav_path = "input.wav"
    audio = AudioSegment.from_file(input_path, format="webm")
    audio.export(wav_path, format="wav")
    
    # Process the WAV file
    user_input = speech_to_text(wav_path)
    response_text = generate_response(user_input, avatar_context)
    text_to_speech(response_text, "response.mp3")
    
    # Clean up temporary files
    os.remove(input_path)
    os.remove(wav_path)
    
    # Send the response audio back to the frontend
    return send_file("response.mp3", mimetype="audio/mp3")

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)