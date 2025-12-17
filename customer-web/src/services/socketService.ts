import { io, Socket } from 'socket.io-client';
import { config, AUTH_TOKEN_KEY } from '../config';
import type {
  TextStartPayload,
  TextChunkPayload,
  TextStopPayload,
  StatusSwitchPayload,
  CallStartPayload,
  CallEndPayload,
  AudioStartPayload,
  AudioStopPayload,
  AudioFilePayload,
} from '../types';

type EventCallback<T> = (payload: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;
  private eventCallbacks: Map<string, EventCallback<any>[]> = new Map();

  /**
   * Connect to Socket.IO server with JWT authentication
   */
  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    this.socket = io(config.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
      // Re-register all callbacks on reconnection
      this.reregisterCallbacks();
      // Re-join room if there was one
      if (this.currentRoom) {
        this.socket?.emit('join', { conversation_id: this.currentRoom });
        console.log('Rejoined room on reconnection:', this.currentRoom);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.socket?.removeAllListeners();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    return this.socket;
  }

  /**
   * Re-register all stored callbacks after reconnection
   */
  private reregisterCallbacks(): void {
    this.eventCallbacks.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
    console.log('Re-registered callbacks for events:', Array.from(this.eventCallbacks.keys()));
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
      // Note: We keep eventCallbacks so they can be re-registered on reconnect
    }
  }

  /**
   * Register a callback and store it for re-registration on reconnect
   */
  private registerCallback<T>(event: string, callback: EventCallback<T>): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
    this.socket?.on(event, callback);
  }

  /**
   * Join a conversation room
   */
  joinRoom(conversationId: string): void {
    if (!this.socket?.connected) {
      this.connect();
    }

    // Leave previous room if any
    if (this.currentRoom && this.currentRoom !== conversationId) {
      this.leaveRoom(this.currentRoom);
    }

    this.socket?.emit('join', { conversation_id: conversationId });
    this.currentRoom = conversationId;
    console.log('Joined room:', conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveRoom(conversationId: string): void {
    this.socket?.emit('leave', { conversation_id: conversationId });
    if (this.currentRoom === conversationId) {
      this.currentRoom = null;
    }
    console.log('Left room:', conversationId);
  }

  // ============================================
  // Text Events (Server → Client)
  // ============================================

  onTextStart(callback: EventCallback<TextStartPayload>): void {
    this.registerCallback('text_start', callback);
  }

  onTextChunk(callback: EventCallback<TextChunkPayload>): void {
    this.registerCallback('text_chunk', callback);
  }

  onTextStop(callback: EventCallback<TextStopPayload>): void {
    this.registerCallback('text_stop', callback);
  }

  // ============================================
  // Status Events (Server → Client)
  // ============================================

  onStatusSwitch(callback: EventCallback<StatusSwitchPayload>): void {
    this.registerCallback('status_switch', callback);
  }

  // ============================================
  // Call Events (Client → Server)
  // ============================================

  /**
   * Emit call_start event when starting a voice call
   */
  emitCallStart(conversationId: string): void {
    const payload: CallStartPayload = { conversation_id: conversationId };
    this.socket?.emit('call_start', payload);
    console.log('Emitted call_start:', payload);
  }

  /**
   * Emit call_end event when ending a voice call
   */
  emitCallEnd(conversationId: string): void {
    const payload: CallEndPayload = { conversation_id: conversationId };
    this.socket?.emit('call_end', payload);
    console.log('Emitted call_end:', payload);
  }

  // ============================================
  // Audio Events (Bidirectional)
  // ============================================

  /**
   * Emit audio_start event
   */
  emitAudioStart(conversationId: string): void {
    const payload: AudioStartPayload = { conversation_id: conversationId };
    this.socket?.emit('audio_start', payload);
  }

  /**
   * Emit audio_chunk event with PCM data
   * Each chunk MUST be exactly 640 bytes (20ms at 16kHz, 16-bit mono)
   */
  emitAudioChunk(conversationId: string, audioData: ArrayBuffer): void {
    this.socket?.emit('audio_chunk', {
      conversation_id: conversationId,
      audio: audioData,
    });
  }

  /**
   * Emit audio_stop event
   */
  emitAudioStop(conversationId: string): void {
    const payload: AudioStopPayload = { conversation_id: conversationId };
    this.socket?.emit('audio_stop', payload);
  }

  /**
   * Listen for audio_start from server
   */
  onAudioStart(callback: EventCallback<AudioStartPayload>): void {
    this.registerCallback('audio_start', callback);
  }

  /**
   * Listen for audio_chunk from server
   */
  onAudioChunk(callback: (payload: { conversation_id: string; audio: ArrayBuffer }) => void): void {
    this.registerCallback('audio_chunk', callback);
  }

  /**
   * Listen for audio_stop from server
   */
  onAudioStop(callback: EventCallback<AudioStopPayload>): void {
    this.registerCallback('audio_stop', callback);
  }

  /**
   * Listen for audio_file from server (TTS output)
   */
  onAudioFile(callback: EventCallback<AudioFilePayload>): void {
    this.registerCallback('audio_file', callback);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.socket?.off(event);
    this.eventCallbacks.delete(event);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
    this.eventCallbacks.clear();
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
