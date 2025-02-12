"use client";
import { useState, useRef } from "react";

export default function Home() {
  const questions = [
    "あなたの名前は？",
    "あなたの趣味は？",
    "どんな仕事をしているの？"
  ];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<{ sender: "AI" | "User"; text: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [isQuestionStarted, setIsQuestionStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const historyRef = useRef<{ question: string; answer: string; evaluation: string }[]>([]);

  const currentQuestion = questions[currentQuestionIndex];

  // ✅ AIの質問をチャットに追加して読み上げる
  const askQuestion = async () => {
    if (currentQuestionIndex >= questions.length) {
      setIsModalOpen(true);
      return;
    }

    setIsQuestionStarted(true); // ✅ 質問開始フラグをセット

    const question = currentQuestion;
    setMessages((prev) => [...prev, { sender: "AI", text: question }]);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question }),
      });

      if (!response.ok) throw new Error("Failed to generate speech");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await audio.play();
      audio.onended = () => {
      };
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  // ✅ 録音を開始する（長押しで録音開始）
  const startRecording = async () => {
    setIsRecording(true);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Microphone access error:", error);
    }
  };

  // ✅ 録音を停止する（ボタンを離すと録音停止）
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendAudioToAPI(audioBlob);
      };
    }
  };

  // ✅ Whisper API で音声をテキストに変換
  const sendAudioToAPI = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    try {
      const response = await fetch("/api/whisper", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to transcribe audio");

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "User", text: data.text }]);

      // ✅ ChatGPT に回答を送信して評価
      await evaluateAnswer(currentQuestion, data.text);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    }
  };

  // ✅ ChatGPT API に回答を送信して評価
  const evaluateAnswer = async (question: string, answer: string) => {
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });

      if (!response.ok) throw new Error("Failed to evaluate answer");

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "AI", text: data.evaluation }]);

      // ✅ 過去の会話履歴を保存
      historyRef.current.push({ question, answer, evaluation: data.evaluation });

      // ✅ 評価を読み上げる
      speakEvaluation(data.evaluation);
    } catch (error) {
      console.error("Error evaluating answer:", error);
    }
  };

  // ✅ AIが評価結果を喋る（TTS）
  const speakEvaluation = async (text: string) => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Failed to generate evaluation speech");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await audio.play();
      audio.onended = () => {
        moveToNextQuestion();
      };
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      setIsQuestionStarted(false);
    } else {
      setIsModalOpen(true);
    }
  };


  // ✅ 総合評価を取得
  const getSummary = async () => {
    const historyText = historyRef.current.map(h => `質問: ${h.question}, 回答: ${h.answer}, 評価: ${h.evaluation}`).join("\n");

    const response = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: historyText }),
    });

    const data = await response.json();
    setSummary(data.summary);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">AI会話アプリ</h1>
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-4 h-[640px] overflow-y-auto flex flex-col gap-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[75%] p-2 text-sm rounded-lg ${
              msg.sender === "AI" ? "bg-blue-200 self-start" : "bg-green-200 self-end"
            }`}
          >
            <strong>{msg.sender}</strong>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      {!isQuestionStarted && (
        <button onClick={askQuestion} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
          質問を開始
        </button>
      )}

      {isQuestionStarted && (
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className={`w-16 h-16 mt-4 rounded-full flex items-center justify-center ${
            isRecording ? "bg-red-600" : "bg-gray-400"
          }`}
        >
          🎤
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg text-center w-80">
            <h2 className="text-2xl font-bold mb-4">宿題が完了しました！</h2>
            <button onClick={getSummary} className="bg-green-500 text-white px-4 py-2 rounded mb-4">
              総合評価をする
            </button>
            {summary && <p className="mt-2 text-lg font-semibold">{summary}</p>}
            <button onClick={() => setIsModalOpen(false)} className="mt-4 bg-gray-500 text-white px-4 py-2 rounded">
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
