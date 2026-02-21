import { useState, useRef, useEffect } from 'react';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Typed Web Speech API declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const SpeechRecognitionAPI =
  window.SpeechRecognition ?? window.webkitSpeechRecognition;

export default function VoiceInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [supported] = useState(() => !!SpeechRecognitionAPI);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef('');

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const startListening = () => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    finalRef.current = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalRef.current += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText('');
      const transcript = finalRef.current.trim();
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  if (!supported) {
    return (
      <div className="text-xs text-gray-400 italic">
        Voice input not supported in this browser. Use Chrome or Edge.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${listening
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'btn-secondary'
          } disabled:opacity-50`}
      >
        {/* Mic icon */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          {listening ? (
            <rect x="6" y="6" width="12" height="12" rx="2" />
          ) : (
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm-1 19.93A8.001 8.001 0 0 1 4.07 13H2a10 10 0 0 0 9 9.93V23h2v-.07A10 10 0 0 0 22 13h-2.07A8.001 8.001 0 0 1 13 20.93V19a1 1 0 0 0-2 0v1.93z" />
          )}
        </svg>
        {listening ? 'Stop Recording' : 'Start Dictation'}
        {listening && (
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {interimText && (
        <span className="text-sm text-gray-400 italic truncate max-w-xs">
          "{interimText}"
        </span>
      )}
      {!listening && !interimText && (
        <span className="text-xs text-gray-400">
          Dictate the offer details, then they'll be auto-extracted
        </span>
      )}
    </div>
  );
}
