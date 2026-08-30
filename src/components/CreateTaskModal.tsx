import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Mic,
  Square,
  Pause,
  Play,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import DatePicker from './DatePicker';
import { firebaseConfig } from '../firebase';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, scheduledDate?: string | null, description?: string | null) => void;
  initialScheduledDate?: string | null;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onCreate,
  initialScheduledDate,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);

  // Voice recording & AI parsing states:
  // 'idle' | 'listening' | 'analyzing' | 'complete' | 'error'
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'analyzing' | 'complete' | 'error'>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const accumulatedTranscriptRef = useRef<string>('');

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setScheduledDate(initialScheduledDate || null);
      setVoiceState('idle');
      setIsPaused(false);
      isPausedRef.current = false;
      setRecordingSeconds(0);
      setStatusMessage('');
      accumulatedTranscriptRef.current = '';
      isListeningRef.current = false;

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    } else {
      stopAndCleanupAudio();
    }
  }, [isOpen, initialScheduledDate]);

  useEffect(() => {
    return () => {
      stopAndCleanupAudio();
    };
  }, []);

  const stopAndCleanupAudio = () => {
    isListeningRef.current = false;
    isPausedRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Analyze text transcript with Gemini AI
  const analyzeTranscriptWithAI = async (transcriptText: string) => {
    if (!transcriptText || !transcriptText.trim()) {
      setVoiceState('error');
      setStatusMessage('No speech was detected. Click to try again.');
      return;
    }

    setVoiceState('analyzing');
    setStatusMessage('Analyzing speech with Gemini AI...');

    try {
      let extractedData: { title?: string; description?: string; scheduledDate?: string | null } | null = null;

      // 1. Direct client-side Gemini API call for static hosts (GitHub Pages)
      const userGeminiKey = localStorage.getItem('nestnote_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
      const effectiveKey = userGeminiKey || firebaseConfig.apiKey;

      if (effectiveKey && effectiveKey !== "AIzaSy_demo_fallback_key") {
        const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
        for (const model of models) {
          try {
            const prompt = `You are an AI task assistant. Extract structured task details from this text transcript:
1. "title": Crisp task summary (max 6-8 words)
2. "description": Detailed task notes and context
3. "scheduledDate": ISO YYYY-MM-DD date string if a date was mentioned (today is ${new Date().toISOString().split('T')[0]}), otherwise null

Respond ONLY with valid JSON object in format: {"title": "...", "description": "...", "scheduledDate": null}

Input text: "${transcriptText.trim()}"`;

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                }),
              }
            );

            if (geminiRes.ok) {
              const gData = await geminiRes.json();
              const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              const jsonMatch = rawText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
                break;
              }
            }
          } catch (gErr) {
            console.warn(`Gemini API model ${model} notice:`, gErr);
          }
        }
      }

      // 2. Attempt local backend route if direct client call returned nothing
      if (!extractedData) {
        try {
          const response = await fetch('/api/voice-task/analyze-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: transcriptText.trim(),
              currentDate: new Date().toISOString().split('T')[0],
              timezoneOffsetMinutes: new Date().getTimezoneOffset(),
            }),
          });
          if (response.ok) {
            extractedData = await response.json();
          }
        } catch (err) {
          console.warn('Backend route not available:', err);
        }
      }

      // Apply extracted data
      if (extractedData) {
        if (extractedData.title) setTitle(extractedData.title);
        if (extractedData.description !== undefined && extractedData.description !== null) {
          setDescription(extractedData.description);
        }
        if (extractedData.scheduledDate) setScheduledDate(extractedData.scheduledDate);
      } else {
        // NLP Smart Fallback
        const words = transcriptText.trim().split(/\s+/);
        const fallbackTitle = words.slice(0, 7).join(' ');
        const fallbackDesc = words.length > 7 ? words.slice(7).join(' ') : '';
        setTitle(fallbackTitle || transcriptText);
        if (fallbackDesc) setDescription(fallbackDesc);
      }

      setVoiceState('complete');
      setStatusMessage('Transcription complete. Details extracted.');
    } catch (err: any) {
      console.error('Error analyzing transcript:', err);
      const words = transcriptText.trim().split(/\s+/);
      setTitle(words.slice(0, 7).join(' ') || transcriptText);
      setVoiceState('complete');
      setStatusMessage('Transcription complete. Details extracted.');
    }
  };

  // Process raw audio via Gemini audio transcription
  const processRecordedAudioBlob = async (blob: Blob) => {
    setVoiceState('analyzing');
    setStatusMessage('Transcribing audio with Gemini AI...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await fetch('/api/voice-task/transcribe-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: blob.type || 'audio/webm',
              currentDate: new Date().toISOString().split('T')[0],
              timezoneOffsetMinutes: new Date().getTimezoneOffset(),
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to process voice audio');
          }

          const data = await response.json();
          if (data.title) {
            setTitle(data.title);
          }
          if (data.description !== undefined && data.description !== null) {
            setDescription(data.description);
          }
          if (data.scheduledDate) {
            setScheduledDate(data.scheduledDate);
          }

          setVoiceState('complete');
          setStatusMessage('Transcription complete. Details extracted.');
        } catch (err: any) {
          console.error('Audio transcription error:', err);
          setVoiceState('error');
          setStatusMessage(err.message || 'Could not process audio recording.');
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      console.error('Error reading audio blob:', err);
      setVoiceState('error');
      setStatusMessage('Failed to read recording.');
    }
  };

  // Start continuous voice recording
  const handleStartVoice = async () => {
    setVoiceState('listening');
    setIsPaused(false);
    isPausedRef.current = false;
    setRecordingSeconds(0);
    setStatusMessage('Listening...');
    accumulatedTranscriptRef.current = '';
    isListeningRef.current = true;

    // Start timer counter
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setRecordingSeconds((prev) => prev + 1);
      }
    }, 1000);

    // Start MediaRecorder audio stream in parallel
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
    } catch (streamErr) {
      console.warn('getUserMedia error (may rely on Web Speech API):', streamErr);
    }

    // Initialize Web Speech API for live transcription
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';

        recognition.onresult = (event: any) => {
          let full = '';
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript + ' ';
          }
          accumulatedTranscriptRef.current = full.trim();
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition warning:', event.error);
          if (event.error === 'not-allowed') {
            setVoiceState('error');
            setStatusMessage('Microphone access denied. Please grant microphone permission.');
            stopAndCleanupAudio();
          }
        };

        // If recognition stops automatically, restart it as long as user hasn't paused or clicked Done
        recognition.onend = () => {
          if (isListeningRef.current && !isPausedRef.current && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // ignore
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn('Web Speech API start error:', err);
      }
    }
  };

  // Toggle Pause / Resume recording
  const handleTogglePause = () => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      isPausedRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        try {
          mediaRecorderRef.current.resume();
        } catch (e) {
          // ignore
        }
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // ignore
        }
      }
    } else {
      // Pause
      setIsPaused(true);
      isPausedRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.pause();
        } catch (e) {
          // ignore
        }
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    }
  };

  // User explicitly clicks the Done / Stop button
  const handleDoneRecording = () => {
    isListeningRef.current = false;
    isPausedRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    const transcript = accumulatedTranscriptRef.current;

    // Stop MediaRecorder and trigger Gemini extraction
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        // If Web Speech API captured text transcript, analyze directly via Gemini
        if (transcript && transcript.trim().length > 0) {
          analyzeTranscriptWithAI(transcript);
        } else if (audioChunksRef.current.length > 0) {
          // Otherwise send recorded audio blob to Gemini for transcription & extraction
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || 'audio/webm',
          });
          processRecordedAudioBlob(blob);
        } else {
          setVoiceState('error');
          setStatusMessage('No speech detected. Click to try again.');
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        if (transcript) analyzeTranscriptWithAI(transcript);
      }
    } else {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      if (transcript && transcript.trim().length > 0) {
        analyzeTranscriptWithAI(transcript);
      } else {
        setVoiceState('error');
        setStatusMessage('No speech detected. Click to try again.');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onCreate(trimmedTitle, scheduledDate, description ? description.trim() || null : null);
    onClose();
  };

  const isListening = voiceState === 'listening';
  const isAnalyzing = voiceState === 'analyzing';
  const isComplete = voiceState === 'complete';
  const isError = voiceState === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
      />

      {/* Modal Container */}
      <div className="bg-white dark:bg-[#191918] text-[#37352F] dark:text-[#E3E3E2] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl w-full max-w-[440px] shadow-2xl relative z-10 p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-2.5">
            <span className="p-1.5 bg-[#E3F2FD] dark:bg-[#1E3A5F]/40 text-[#2383E2] rounded-lg mt-0.5 shrink-0">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-xs font-extrabold text-[#37352F] dark:text-[#E3E3E2] uppercase tracking-wider">
                Create New Task
              </h3>
              <p className="text-[11px] text-[#787774] dark:text-[#888886] mt-0.5 leading-snug">
                Type details or use AI speech-to-text to automatically extract title & notes
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A] rounded-lg text-[#ACABA9] hover:text-[#37352F] dark:hover:text-[#E3E3E2] transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1. Voice Interaction Component (Matching the 3 states from the provided flow) */}
        {isListening ? (
          /* STATE 2: LISTENING STATE (Continuous recording with premature time, stop, and pause controls) */
          <div className="mb-5 p-3.5 bg-[#F7F6F3] dark:bg-[#20201E] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl flex items-center justify-between shadow-xs transition-all">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#BFDBFE] dark:bg-[#93C5FD] text-[#1E40AF] flex items-center justify-center shadow-xs relative">
                <Mic size={20} className={`text-[#1E40AF] ${!isPaused ? 'animate-pulse' : ''}`} />
                {!isPaused && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#37352F] dark:text-[#E3E3E2]">
                    {isPaused ? 'Paused' : 'Listening...'}
                  </span>
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#EDECE9] dark:bg-[#2C2C2A] text-[#787774] dark:text-[#ACABA9]">
                    {formatTime(recordingSeconds)}
                  </span>
                </div>
                <p className="text-[10px] text-[#787774] dark:text-[#888886] mt-0.5">
                  {isPaused ? 'Press play to resume capture' : 'Recording continuously without auto-stop'}
                </p>
              </div>
            </div>

            {/* Controls: Pause/Resume + Stop/Done Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Pause / Resume Button */}
              <button
                type="button"
                onClick={handleTogglePause}
                className="h-9 w-9 rounded-full border border-[#ACABA9] dark:border-[#888886] hover:border-[#37352F] dark:hover:border-white text-[#37352F] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                title={isPaused ? 'Resume recording' : 'Pause recording'}
              >
                {isPaused ? <Play size={13} className="fill-current ml-0.5" /> : <Pause size={13} className="fill-current" />}
              </button>

              {/* Done / Stop Button */}
              <button
                type="button"
                onClick={handleDoneRecording}
                className="h-9 w-9 rounded-full border border-[#ACABA9] dark:border-[#888886] hover:border-[#37352F] dark:hover:border-white text-[#37352F] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                title="Stop and extract details"
              >
                <Square size={12} className="fill-current" />
              </button>
            </div>
          </div>
        ) : (
          /* STATE 1 & 3: IDLE, COMPLETE, ANALYZING, OR ERROR BANNER */
          <div 
            onClick={!isAnalyzing ? handleStartVoice : undefined}
            className={`mb-5 p-3.5 bg-[#F7F6F3] dark:bg-[#20201E] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-2xl flex items-center gap-3 transition-all ${
              isAnalyzing
                ? 'opacity-80 cursor-wait'
                : 'cursor-pointer hover:border-[#2383E2]/50'
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-[#2383E2] text-white flex items-center justify-center shrink-0 shadow-xs">
              {isAnalyzing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Mic size={20} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#37352F] dark:text-[#E3E3E2]">
                Voice-to-Task AI
              </div>
              
              {isAnalyzing ? (
                <div className="text-[11px] text-[#2383E2] flex items-center gap-1.5 mt-0.5 font-medium">
                  <span>Analyzing speech with Gemini AI...</span>
                </div>
              ) : isComplete ? (
                <div className="text-[11px] text-[#2383E2] flex items-center gap-1 mt-0.5 font-semibold">
                  <Check size={12} className="stroke-[3]" />
                  <span>Transcription complete. Details extracted.</span>
                </div>
              ) : isError ? (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                  <AlertCircle size={12} />
                  <span>{statusMessage || 'Click to try speaking again'}</span>
                </div>
              ) : (
                <div className="text-[11px] text-[#787774] dark:text-[#888886] mt-0.5">
                  Click microphone to speak your task and full notes
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Modal Form Fields */}
        {isListening ? (
          /* When listening: Show clean subtext and disabled action button matching the spec image */
          <div className="space-y-6">
            <p className="text-xs text-[#787774] dark:text-[#888886] leading-relaxed">
              Your notes, subtasks, and updates will be organized directly inside the task editor.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EDECE9] dark:border-[#2C2C2A]/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#787774] dark:text-[#888886] hover:text-[#37352F] dark:hover:text-[#E3E3E2] rounded-xl hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-[#EDECE9] dark:bg-[#2C2C2A] text-[#ACABA9] dark:text-[#666664] rounded-xl text-xs font-bold cursor-not-allowed"
              >
                Create Task
              </button>
            </div>
          </div>
        ) : (
          /* Standard and Populated Form States */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Name (Required) */}
            <div>
              <label className="block text-[10px] font-bold text-[#787774] dark:text-[#888886] uppercase tracking-wider mb-1.5">
                Task Name (Required)
              </label>
              <input
                ref={inputRef}
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Q3 Marketing Pitch deck"
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-[#20201E] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl outline-none focus:border-[#2383E2] text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9] dark:placeholder-[#666664] shadow-xs transition-all"
              />
            </div>

            {/* Notes / Description (Optional) - Shown when complete or when text is present */}
            {(isComplete || description || isAnalyzing) && (
              <div className="animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-[#888886] uppercase tracking-wider">
                    Notes / Description (Optional)
                  </label>
                  <span className="text-[10px] text-[#787774] dark:text-[#888886]">
                    Nested under task
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Include background context and budget requirements extracted from speech"
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#20201E] border border-[#EDECE9] dark:border-[#2C2C2A] rounded-xl outline-none focus:border-[#2383E2] text-[#37352F] dark:text-[#E3E3E2] placeholder-[#ACABA9] dark:placeholder-[#666664] shadow-xs transition-all resize-none leading-relaxed"
                />
              </div>
            )}

            {/* Schedule Date (Optional) */}
            <div>
              <label className="block text-[10px] font-bold text-[#787774] dark:text-[#888886] uppercase tracking-wider mb-1.5">
                Schedule Date (Optional)
              </label>
              <DatePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                placeholder="Set date (optional)"
                variant="field"
                iconType="calendar"
                iconColor="text-[#2383E2]"
              />
            </div>

            {/* Helper Text */}
            <p className="text-[10px] text-[#787774] dark:text-[#888886] leading-relaxed pt-1">
              Every workspace entry is centered around an active task. Your notes, subtasks, and updates will be organized directly inside the task editor.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDECE9] dark:border-[#2C2C2A]/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#787774] dark:text-[#888886] hover:text-[#37352F] dark:hover:text-[#E3E3E2] rounded-xl hover:bg-[#EBEAE4] dark:hover:bg-[#2C2C2A] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isAnalyzing}
                className="px-4 py-2 bg-[#2383E2] hover:bg-[#1C69B5] disabled:opacity-40 disabled:hover:bg-[#2383E2] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Create Task</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
