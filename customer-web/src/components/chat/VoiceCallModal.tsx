import { useState, useEffect, useRef, useCallback } from 'react';
import { useConversation } from '../../contexts';
import { useMicVAD } from '@ricky0123/vad-react';
import { socketService } from '../../services';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Bot,
  Users,
  Volume2,
  Loader2,
} from 'lucide-react';

interface VoiceCallModalProps {
  onClose: () => void;
}

export default function VoiceCallModal({ onClose }: VoiceCallModalProps) {
  const {
    currentConversation,
    endCall,
    isMuted,
    toggleMute,
    isCallActive,
    submitAudio,
    audioToPlay,
    clearAudioToPlay,
  } = useConversation();

  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);

  // Determine call mode based on conversation status
  const isAICall = currentConversation?.status === 'AI_AGENT_CALLING';
  const isHumanCall = currentConversation?.status === 'HUMAN_AGENT_CALLING';

  // VAD configuration for AI_AGENT_CALLING mode
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => {
      console.log('VAD: Speech started');
      setIsRecording(true);
    },
    onSpeechEnd: async (audio: Float32Array) => {
      console.log('VAD: Speech ended, submitting audio');
      setIsRecording(false);
      
      if (currentConversation && isAICall) {
        // Convert Float32Array to WAV format and submit
        const wavBlob = convertFloat32ToWav(audio, 16000);
        await submitAudio(wavBlob);
      }
    },
    onVADMisfire: () => {
      console.log('VAD: Misfire detected');
      setIsRecording(false);
    },
    positiveSpeechThreshold: 0.8,
    negativeSpeechThreshold: 0.8 - 0.15,
    redemptionFrames: 8,
    preSpeechPadFrames: 1,
    minSpeechFrames: 3,
    submitUserSpeechOnPause: true,
  });

  // Start call timer
  useEffect(() => {
    if (callStatus === 'connected') {
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  // Initialize audio context and start appropriate recording mode
  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          } 
        });
        streamRef.current = stream;
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        
        setCallStatus('connected');
        
        // Start appropriate recording mode based on conversation status
        if (isAICall) {
          // Use VAD for AI_AGENT_CALLING
          vad.start();
        } else if (isHumanCall) {
          // Stream PCM chunks for HUMAN_AGENT_CALLING
          startPCMStreaming(stream);
        }
      } catch (error) {
        console.error('Failed to access microphone:', error);
        alert('Không thể truy cập microphone. Vui lòng cấp quyền và thử lại.');
        handleHangUp();
      }
    };

    if (isCallActive) {
      initAudio();
    }

    return () => {
      // Cleanup
      vad.pause();
      stopPCMStreaming();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isCallActive, isAICall, isHumanCall]);

  // Handle audio playback from server
  useEffect(() => {
    if (audioToPlay) {
      playAudio(audioToPlay);
      clearAudioToPlay();
    }
  }, [audioToPlay, clearAudioToPlay]);

  // PCM Streaming for HUMAN_AGENT_CALLING mode
  const startPCMStreaming = async (stream: MediaStream) => {
    if (!audioContextRef.current || !currentConversation) return;

    try {
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create ScriptProcessorNode for processing audio in chunks
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      // Emit audio_start
      socketService.emitAudioStart(currentConversation.id);
      
      let pcmBuffer: Int16Array = new Int16Array(0);
      const targetChunkSize = 320; // 320 samples = 20ms at 16kHz
      
      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Append to buffer
        const newBuffer = new Int16Array(pcmBuffer.length + int16Data.length);
        newBuffer.set(pcmBuffer);
        newBuffer.set(int16Data, pcmBuffer.length);
        pcmBuffer = newBuffer;
        
        // Send chunks of exactly 320 samples (640 bytes)
        while (pcmBuffer.length >= targetChunkSize) {
          const chunk = pcmBuffer.slice(0, targetChunkSize);
          pcmBuffer = pcmBuffer.slice(targetChunkSize);
          
          // Send via Socket.IO
          const arrayBuffer = chunk.buffer.slice(
            chunk.byteOffset,
            chunk.byteOffset + chunk.byteLength
          );
          socketService.emitAudioChunk(currentConversation.id, arrayBuffer);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      audioWorkletNodeRef.current = processor as any;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start PCM streaming:', error);
    }
  };

  const stopPCMStreaming = () => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    
    if (currentConversation && isHumanCall) {
      socketService.emitAudioStop(currentConversation.id);
    }
    
    setIsRecording(false);
  };

  // Convert Float32Array to WAV format
  const convertFloat32ToWav = (samples: Float32Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const playAudio = async (audioData: ArrayBuffer) => {
    try {
      setIsPlaying(true);
      
      // Pause VAD during playback if in AI mode
      if (isAICall) {
        vad.pause();
      }
      
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        setIsPlaying(false);
        audioContext.close();
        
        // Resume VAD after playback if in AI mode
        if (isAICall && isCallActive) {
          vad.start();
        }
      };
      source.start();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      
      // Resume VAD even on error
      if (isAICall && isCallActive) {
        vad.start();
      }
    }
  };

  const handleHangUp = useCallback(() => {
    vad.pause();
    stopPCMStreaming();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setCallStatus('ended');
    endCall();
    setTimeout(onClose, 500);
  }, [endCall, onClose, vad]);

  const handleToggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    toggleMute();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-primary-800 to-primary-900 flex flex-col items-center justify-center z-50">
      {/* Voice On Badge */}
      <div className="absolute top-6 right-6">
        <span className="px-4 py-2 bg-white/20 text-white rounded-full text-sm font-medium">
          Voice On
        </span>
      </div>

      {/* Avatar */}
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-xl call-pulse">
          {isAICall ? (
            <Bot className="w-16 h-16 text-white" />
          ) : (
            <Users className="w-16 h-16 text-white" />
          )}
        </div>
        
        {/* Status indicator */}
        {isPlaying && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs text-text-main font-medium">Đang phát</span>
          </div>
        )}
      </div>

      {/* Caller Name */}
      <h2 className="text-2xl font-semibold text-white mb-2">
        {isAICall ? 'AI Tư vấn' : 'Nhân viên hỗ trợ'}
      </h2>

      {/* App Name */}
      <p className="text-4xl font-bold text-white mb-4">(Telcenter)</p>

      {/* Call Status */}
      <div className="flex items-center gap-2 mb-8">
        {callStatus === 'connecting' ? (
          <>
            <Loader2 className="w-5 h-5 text-white/80 animate-spin" />
            <span className="text-white/80">Đang kết nối...</span>
          </>
        ) : callStatus === 'ended' ? (
          <span className="text-white/80">Cuộc gọi đã kết thúc</span>
        ) : (
          <>
            <Phone className="w-5 h-5 text-success animate-pulse" />
            <span className="text-white/80">{formatDuration(callDuration)}</span>
          </>
        )}
      </div>

      {/* Recording Indicator */}
      {isRecording && !isMuted && callStatus === 'connected' && (
        <div className="mb-8 flex items-center gap-2 px-4 py-2 bg-error/20 rounded-full">
          <div className="w-3 h-3 bg-error rounded-full animate-pulse" />
          <span className="text-white text-sm">Đang ghi âm...</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* Mute Button */}
        <button
          onClick={handleToggleMute}
          disabled={callStatus !== 'connected'}
          className={`p-4 rounded-full transition-all ${
            isMuted
              ? 'bg-error text-white'
              : 'bg-white/20 text-white hover:bg-white/30'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>

        {/* Hang Up Button */}
        <button
          onClick={handleHangUp}
          className="p-5 bg-error text-white rounded-full hover:bg-red-600 transition-all shadow-lg hover:shadow-xl"
        >
          <PhoneOff className="w-8 h-8" />
        </button>
      </div>

      {/* Labels */}
      <div className="flex items-center gap-16 mt-4 text-white/80 text-sm">
        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        <span>Hang up</span>
      </div>

      {/* Disclaimer */}
      <p className="absolute bottom-6 text-white/50 text-xs">
        Cuộc gọi đang được ghi âm để cải thiện chất lượng dịch vụ
      </p>
    </div>
  );
}
