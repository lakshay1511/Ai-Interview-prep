"use client";

import React, { useEffect, useRef, useState } from "react";
import { storage, db, auth } from "@/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";

interface Props {
  interviewId: string;
}

// Tell TypeScript about global faceapi injected by the <script> tag
declare global {
  interface Window {
    faceapi?: any;
  }
}

const CameraRecorder: React.FC<Props> = ({ interviewId }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const detectionRafRef = useRef<number | null>(null);
  const modelsLoadedRef = useRef(false);
  const alertedRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [facesCount, setFacesCount] = useState<number>(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // 1) wait for faceapi to be available, then load models
  useEffect(() => {
    let checkInterval: number | undefined;

    const tryLoad = async () => {
      if (typeof window === "undefined") return;
      if (window.faceapi) {
        // stop the interval
        if (checkInterval) window.clearInterval(checkInterval);

        try {
          // load only tiny face detector model (lightweight)
          await window.faceapi.nets.tinyFaceDetector.loadFromUri("/models");
          modelsLoadedRef.current = true;
          setModelsLoaded(true);
          // optional: tune TinyFaceDetectorOptions in detection
          console.log("face-api models loaded ✅");
        } catch (err) {
          console.error("Failed to load face-api models:", err);
        }
      }
    };

    // keep checking until faceapi is injected by script
    checkInterval = window.setInterval(tryLoad, 250);
    // also try immediately once
    tryLoad();

    return () => {
      if (checkInterval) window.clearInterval(checkInterval);
    };
  }, []);

  // Helper: draw detections to canvas overlay
const drawDetections = (detections: any[]) => {
  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // FIX: Wait until video is fully ready
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return;
  }

  // FIX: Set canvas to EXACT video size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "lime";
  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(0,0,0,0.5)";

  detections.forEach((d: any, i: number) => {
    // FIX: Support all detection shapes
    const box =
      d.box ||
      d.detection?.box ||
      (d?.detection?._box ? d.detection._box : null);

    if (!box) return;

    const { x, y, width, height } = box;

    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();

    const label = `Face ${i + 1}`;
    const textWidth = ctx.measureText(label).width;

    ctx.fillRect(x, y - 22, textWidth + 10, 22);
    ctx.fillStyle = "white";
    ctx.fillText(label, x + 4, y - 6);
  });
};

  // detection loop using requestAnimationFrame
  const startFaceDetectionLoop = () => {
    if (detectionRafRef.current) return; // already running
    setDetecting(true);

    const loop = async () => {
      try {
        const video = videoRef.current;
        if (
          !video ||
          video.readyState < 2 || // HAVE_CURRENT_DATA
          !window.faceapi ||
          !modelsLoadedRef.current
        ) {
          detectionRafRef.current = requestAnimationFrame(loop);
          return;
        }

        // tinyFaceDetector options: smaller inputSize => faster, less accurate
        const options = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224 });

        const detections = await window.faceapi.detectAllFaces(video, options);

        // draw boxes
        drawDetections(detections);

        // update count and one-time alert
        const count = detections.length || 0;
        setFacesCount(count);

        if (count >= 2 && !alertedRef.current) {
          alertedRef.current = true; // avoid spamming
          // UI banner
          // Also call native alert once
          window.alert("⚠️ Multiple faces detected!");
        }

      } catch (err) {
        // detection errors shouldn't break loop
        console.error("Face detection error:", err);
      } finally {
        detectionRafRef.current = requestAnimationFrame(loop);
      }
    };

    detectionRafRef.current = requestAnimationFrame(loop);
  };

  const stopFaceDetectionLoop = () => {
    if (detectionRafRef.current !== null) {
      cancelAnimationFrame(detectionRafRef.current);
      detectionRafRef.current = null;
    }
    setDetecting(false);
    setFacesCount(0);
    // clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // start camera (only runs in browser)
  const startCamera = async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Your browser does not support camera access.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      // attach to refs and video element
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // ensure video plays
        await videoRef.current.play().catch(() => {});
      }

      // start detection only if models are loaded
      if (modelsLoadedRef.current) startFaceDetectionLoop();
      else {
        // wait till modelsLoaded state flips then start detection
        const startWhenLoaded = () => {
          if (modelsLoadedRef.current) {
            startFaceDetectionLoop();
            return;
          }
          setTimeout(startWhenLoaded, 250);
        };
        startWhenLoaded();
      }
    } catch (err) {
      console.error("Could not access camera:", err);
      alert("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    // stop detection first
    stopFaceDetectionLoop();

    // stop all tracks
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;

    // detach video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        // @ts-ignore
        videoRef.current.srcObject = null;
      } catch (_) {}
    }

    // reset alert flag so future camera starts can alert again if needed
    alertedRef.current = false;
  };

  // start recording
  const startRecording = () => {
    const s = streamRef.current;
    if (!s) {
      alert("Camera not started.");
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(s);
      recorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        await uploadVideo(blob);
        // optional: keep camera running after recording; comment/uncomment as desired
        // stopCamera();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording start error:", err);
      alert("Could not start recording.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // upload video to Firebase Storage and store URL in Firestore
  const uploadVideo = async (blob: Blob) => {
    try {
      const userId = auth.currentUser?.uid || "anonymous";
      const fileRef = ref(storage, `interviews/${userId}/${interviewId}.webm`);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prog);
        },
        (error) => {
          console.error("Upload failed:", error);
          alert("Upload failed.");
        }
      );

      // await completion
      await uploadTask;
      const url = await getDownloadURL(fileRef);
      setUploadedUrl(url);

      // save to Firestore
      await setDoc(
        doc(db, "feedback", interviewId),
        { videoUrl: url },
        { merge: true }
      );

      setUploadProgress(100);
      alert("✅ Video uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload error occurred.");
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      // stop camera + detection + recorder if anything left
      try {
        stopRecording();
      } catch {}
      try {
        stopCamera();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 mt-8">
      <div className="relative w-80 h-60 rounded-xl overflow-hidden border border-gray-300 shadow-md bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute left-0 top-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* notification banner */}
      {facesCount >= 2 && (
        <div className="px-4 py-2 bg-yellow-400 text-black rounded-md font-semibold">
          ⚠️ Multiple faces detected ({facesCount})
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {/* Start Camera */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={startCamera}
          className="px-5 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow"
        >
          🎥 Start Camera
        </motion.button>

        {/* Stop Camera */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={stopCamera}
          className="px-5 py-2 rounded-lg font-medium bg-gray-700 text-white shadow"
        >
          🚫 Stop Camera
        </motion.button>

        {/* Start Recording */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={startRecording}
          disabled={!streamRef.current || isRecording}
          className={`px-5 py-2 rounded-lg font-medium text-white shadow ${
            !streamRef.current || isRecording
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-600"
          }`}
        >
          ⏺ Start Recording
        </motion.button>

        {/* Stop Recording */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={stopRecording}
          disabled={!isRecording}
          className={`px-5 py-2 rounded-lg font-medium text-white shadow ${
            !isRecording
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-red-500 to-pink-600"
          }`}
        >
          ⏹ Stop Recording
        </motion.button>
      </div>

      {/* upload progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-80">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%`, background: "" }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Uploading... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {uploadProgress === 100 && (
        <p className="text-green-600 font-semibold">✅ Upload complete!</p>
      )}

      {uploadedUrl && (
        <video
          src={uploadedUrl}
          controls
          className="rounded-xl border border-gray-300 shadow-md w-80 h-60 mt-4"
        />
      )}
    </div>
  );
};

export default CameraRecorder;