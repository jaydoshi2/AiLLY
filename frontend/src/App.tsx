import React, { useState, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';

function App() {
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [responseAudioUrl, setResponseAudioUrl] = useState<string | null>(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;  // Use Vite's env variable
  // console.log("Backend URL:", backendUrl);
  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    video: false,
  });

  useEffect(() => {
    return () => {
      if (responseAudioUrl) {
        URL.revokeObjectURL(responseAudioUrl);
      }
    };
  }, [responseAudioUrl]);

  const handleSetAvatar = async () => {
    try {
      const response = await fetch(backendUrl + "/set-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, context }),
      });
      if (response.ok) {
        alert("Avatar set successfully");
      } else {
        alert("Failed to set avatar");
      }
    } catch (error) {
      console.error("Error setting avatar:", error);
      alert("Failed to set avatar");
    }
  };

  const stopRecordingFunc = async () => {
    await stopRecording();
    if (mediaBlobUrl) {
      try {
        const blob = await fetch(mediaBlobUrl).then(res => res.blob());
        const form = new FormData();
        form.append("audio", blob, "audio.wav");
        const response = await fetch(backendUrl + "/process-audio", { // Use backendUrl here too
          method: "POST",
          body: form,
        });
        if (response.ok) {
          const responseBlob = await response.blob();
          const newUrl = URL.createObjectURL(responseBlob);
          setResponseAudioUrl(newUrl);
        } else {
          console.error("Failed to process audio");
          alert("Failed to process audio");
        }
      } catch (error) {
        console.error("Error processing audio:", error);
        alert("Failed to process audio");
      }
    }
  };

  return (
    <div>
      <h1>Set Avatar</h1>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Avatar name" />
      <input value={context} onChange={e => setContext(e.target.value)} placeholder="Avatar context" />
      <button onClick={handleSetAvatar}>Set Avatar</button>

      <h1>Voice Interaction</h1>
      <button disabled={status === "recording"} onClick={startRecording}>Start Recording</button>
      <button disabled={status !== "recording"} onClick={stopRecordingFunc}>Stop Recording</button>
      {responseAudioUrl && <audio src={responseAudioUrl} controls autoPlay></audio>}
    </div>
  );
}

export default App;
