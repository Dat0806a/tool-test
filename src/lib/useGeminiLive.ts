import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { useCallback, useEffect, useRef, useState } from "react";
import { arrayBufferToBase64, base64ToFloat32Array, floatTo16BitPCM } from "./audio-utils";

interface UseGeminiLiveProps {
  apiKey: string;
  systemInstruction?: string;
}

export function useGeminiLive({ apiKey, systemInstruction }: UseGeminiLiveProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [volume, setVolume] = useState(0);
  const [isThinking, setIsThinking] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) return;
    if (!audioContextRef.current) return;

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    
    // Calculate volume for lip sync
    let sum = 0;
    for (let i = 0; i < chunk.length; i++) {
        sum += chunk[i] * chunk[i];
    }
    const rms = Math.sqrt(sum / chunk.length);
    setVolume(Math.min(1, rms * 5)); // Amplify for better visual effect

    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000); // Live API usually 24kHz out
    buffer.copyToChannel(chunk, 0);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      isPlayingRef.current = false;
      setVolume(0);
      playNextChunk();
    };
    source.start();
  }, []);

  const connect = useCallback(async () => {
    if (isConnected) return;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const connectPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            startRecording(connectPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              message.serverContent.modelTurn.parts.forEach((part) => {
                if (part.inlineData?.data) {
                  const audioData = base64ToFloat32Array(part.inlineData.data);
                  audioQueueRef.current.push(audioData);
                  playNextChunk();
                }
              });
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              setVolume(0);
            }

            if (message.serverContent?.turnComplete) {
                setIsThinking(false);
            }

            // Handle transcriptions
            const modelTranscript = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (modelTranscript) {
                 setTranscript(prev => [...prev, { role: 'ai', text: modelTranscript }]);
            }
          },
          onclose: () => setIsConnected(false),
          onerror: (e) => {
            console.error("Gemini Live Error:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            if (errorMessage.includes("Network error") || errorMessage.includes("failed")) {
                console.warn("Possible causes: Invalid API Key, Unsupported Region, or Blocked WebSocket connection.");
            }
            setIsConnected(false);
          },
        }
      });

      sessionRef.current = await connectPromise;

    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      setIsConnected(false);
    }
  }, [apiKey, isConnected, playNextChunk, systemInstruction]);

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    stopRecording();
    setIsConnected(false);
  }, []);

  const startRecording = async (sessionPromise: Promise<any>) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        sessionPromise.then((session) => {
          session.sendRealtimeInput({
            audio: { data: arrayBufferToBase64(pcmBuffer), mimeType: 'audio/pcm;rate=16000' }
          });
        });
      };

      microphoneRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    processorRef.current?.disconnect();
    microphoneRef.current?.disconnect();
    audioContextRef.current?.close();
  };

  return {
    isConnected,
    connect,
    disconnect,
    transcript,
    volume,
    isThinking
  };
}
