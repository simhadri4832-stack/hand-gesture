import { useEffect, useRef, useState } from "react";
import * as tmImage from "@teachablemachine/image";
import "./App.css";

// Replace this with your actual Teachable Machine URL
const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/b93G0DDBT/";

function App() {
  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const runningRef = useRef(false);
  const busyRef = useRef(false);

  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gesture, setGesture] = useState("Ready to start");
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState("");

  async function startCamera() {
    if (runningRef.current || loading) return;

    setLoading(true);
    setError("");
    setGesture("Loading AI model...");

    try {
      // Load the trained Teachable Machine model
      if (!modelRef.current) {
        modelRef.current = await tmImage.load(
          MODEL_URL + "model.json",
          MODEL_URL + "metadata.json"
        );
      }

      // Request webcam permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;

      await video.play();

      runningRef.current = true;
      setIsRunning(true);
      setGesture("Show your hand!");
      setLoading(false);

      predictGesture();
    } catch (err) {
      console.error(err);

      stopCamera();

      setError(
        "Unable to start. Check your model URL, internet connection, and camera permission."
      );
      setGesture("Could not start camera");
      setLoading(false);
    }
  }

  async function predictGesture() {
    if (!runningRef.current || busyRef.current) return;

    const video = videoRef.current;

    if (!video || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(predictGesture);
      return;
    }

    busyRef.current = true;

    try {
      const results = await modelRef.current.predict(video);

      if (!runningRef.current) return;

      const sorted = [...results].sort(
        (a, b) => b.probability - a.probability
      );

      setPredictions(sorted);

      const best = sorted[0];

      if (best && best.probability >= 0.6) {
        setGesture(best.className.replace(/_/g, " "));
      } else {
        setGesture("Gesture not clear");
      }
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Prediction failed. Check the model and browser console.");
    } finally {
      busyRef.current = false;

      if (runningRef.current) {
        frameRef.current = requestAnimationFrame(predictGesture);
      }
    }
  }

  function stopCamera() {
    runningRef.current = false;
    busyRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsRunning(false);
    setLoading(false);
    setPredictions([]);
    setGesture("Camera stopped");
  }

  useEffect(() => {
    return () => {
      runningRef.current = false;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <main className="app">
      <section className="dashboard">
        <header className="header">
          <div className="logo">✋</div>
          <p className="eyebrow">AI VISION PROJECT</p>
          <h1>Hand Gesture Recognition</h1>
          <p className="subtitle">
            Recognize your hand gestures in real time using AI.
          </p>
        </header>

        <div className="main-grid">
          <section className="camera-card">
            <div className="card-heading">
              <h2>📷 Webcam</h2>
              <span className={isRunning ? "live" : "offline"}>
                {isRunning ? "● LIVE" : "● OFFLINE"}
              </span>
            </div>

            <div className="video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={isRunning ? "video active" : "video"}
              />

              {!isRunning && (
                <div className="camera-placeholder">
                  <span>✋</span>
                  <p>Your camera preview appears here</p>
                </div>
              )}
            </div>

            <div className="button-row">
              <button
                className="start-button"
                onClick={startCamera}
                disabled={isRunning || loading}
              >
                {loading ? "Loading..." : "▶ Start Camera"}
              </button>

              <button
                className="stop-button"
                onClick={stopCamera}
                disabled={!isRunning && !loading}
              >
                ■ Stop Camera
              </button>
            </div>

            {error && <p className="error">{error}</p>}
          </section>

          <section className="result-card">
            <p className="eyebrow">RECOGNITION RESULT</p>
            <div className="gesture-icon">🤚</div>
            <h2>{gesture}</h2>
            <p className="result-description">
              {isRunning
                ? "Your gesture is being analyzed."
                : "Start the webcam to detect a gesture."}
            </p>

            <div className="divider" />

            <h3>Gesture Confidence</h3>

            {predictions.length === 0 ? (
              <p className="empty-message">
                Prediction scores will appear here.
              </p>
            ) : (
              predictions.map((item) => (
                <div className="prediction" key={item.className}>
                  <div className="prediction-heading">
                    <span>{item.className.replace(/_/g, " ")}</span>
                    <strong>
                      {Math.round(item.probability * 100)}%
                    </strong>
                  </div>

                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${item.probability * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        <section className="how-it-works">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <span>01</span>
              <h3>Capture</h3>
              <p>The webcam captures your hand.</p>
            </div>

            <div className="step">
              <span>02</span>
              <h3>Analyze</h3>
              <p>The trained AI model predicts the gesture.</p>
            </div>

            <div className="step">
              <span>03</span>
              <h3>Recognize</h3>
              <p>The result and confidence appear on screen.</p>
            </div>
          </div>
        </section>

        <footer>
          Built with React.js · JavaScript · Teachable Machine
        </footer>
      </section>
    </main>
  );
}

export default App;