import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { io } from 'socket.io-client';
import type {
  SocketClient,
  MessageProps,
  ServerChatMessage,
  SocketExceptionData,
  ClientChatMessage,
} from './Chat.types';

// Define the shape of the context state
export interface SocketContextState {
  messages: MessageProps[];
  isConnected: boolean;
  sendMessage: (messageText: string) => void;
}

// Create the context with an undefined default value
export const SocketContext = createContext<SocketContextState | undefined>(undefined);

// Define props for the provider
interface SocketProviderProps {
  children: ReactNode;
  serverUrl?: string; // Allow overriding server URL via prop
  userNickname?: string; // Allow passing user nickname via prop
}

const DEFAULT_SERVER_URL = 'http://localhost:3033';
const DEFAULT_USER_NICKNAME = 'user';

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  serverUrl = DEFAULT_SERVER_URL,
  userNickname = DEFAULT_USER_NICKNAME,
}) => {
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MessageProps[]>([
    { text: 'Connecting to chat...', nickname: 'system', time: Date.now() },
  ]);

  useEffect(() => {
    console.log('Attempting to connect to Socket.IO server at:', serverUrl);
    const newSocket = io(serverUrl, {
      // Optional: Add connection options if needed
      // transports: ['websocket'],
      // reconnectionAttempts: 5,
    });
    setSocket(newSocket);

    const handleConnect = () => {
      console.log('Socket.IO Connected:', newSocket.id);
      setIsConnected(true);
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.text !== 'Connecting to chat...');
        return [...filtered, { text: 'Connected! How may I help you?', nickname: 'bot', time: Date.now() }];
      });
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket.IO Disconnected:', reason);
      setIsConnected(false);
      // Keep socket instance for potential reconnection attempts by socket.io client
      // setSocket(null); // Don't nullify immediately if relying on auto-reconnect
      setMessages((prev) => [
        ...prev,
        { text: `Disconnected: ${reason}. Reconnecting...`, nickname: 'error', time: Date.now() },
      ]);
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket.IO Connection Error:', error);
      setIsConnected(false);
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.text !== 'Connecting to chat...');
        return [...filtered, { text: `Connection failed: ${error.message}.`, nickname: 'error', time: Date.now() }];
      });
    };

    const handleChatMessage = (receivedMsg: ServerChatMessage) => {
      console.log('Message received:', receivedMsg);
      if (receivedMsg && typeof receivedMsg.message === 'string' && typeof receivedMsg.nickname === 'string') {
        setMessages((prev) => [
          ...prev,
          // Use nickname from server, map 'message' to 'text'
          // Use server time if available, otherwise current time
          {
            text: receivedMsg.message,
            nickname: receivedMsg.nickname,
            time:
              typeof receivedMsg.time === 'number' || typeof receivedMsg.time === 'string'
                ? new Date(receivedMsg.time).getTime()
                : Date.now(),
          },
        ]);
      } else {
        console.warn('Received invalid chat message format:', receivedMsg);
      }
    };

    const handleException = (errorData: SocketExceptionData) => {
      console.error('Server Exception:', errorData);
      if (errorData && errorData.status === 'error' && typeof errorData.message === 'string') {
        setMessages((prev) => [...prev, { text: errorData.message, nickname: 'error', time: Date.now() }]);
      } else {
        console.warn('Received unexpected error format:', errorData);
        setMessages((prev) => [
          ...prev,
          { text: 'An unknown server error occurred.', nickname: 'error', time: Date.now() },
        ]);
      }
    };

    // Attach listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('chat', handleChatMessage);
    newSocket.on('exception', handleException);

    // Cleanup function
    return () => {
      console.log('Cleaning up Socket.IO connection...');
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.off('chat', handleChatMessage);
      newSocket.off('exception', handleException);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [serverUrl]);

  const sendMessage = useCallback(
    (messageText: string) => {
      const trimmedMessage = messageText.trim();
      if (!trimmedMessage || !socket || !isConnected) {
        console.warn('Cannot send message: No text, socket not available, or not connected.');
        return;
      }

      const messageToSend: ClientChatMessage = {
        nickname: userNickname,
        message: trimmedMessage,
      };

      // Add user message locally immediately for better UX
      setMessages((prev) => [...prev, { text: messageToSend.message, nickname: userNickname, time: Date.now() }]);

      // Emit the message to the server
      socket.emit('chat', messageToSend, (ack: Record<string, unknown> | undefined) => {
        // Handle acknowledgment from server (optional)
        if (ack?.error) {
          console.error('Message delivery failed (server ACK):', ack.error);
          setMessages((prev) => [
            ...prev,
            { text: `Message failed to send: ${ack.error}`, nickname: 'error', time: Date.now() },
          ]);
          // TODO: Consider removing the optimistic message or marking it as failed
        } else if (ack) {
          console.log('Message acknowledged by server:', ack);
          // Optional: Update message status based on ACK
        } else {
          console.log('Message sent (no ACK received or configured):', messageToSend);
        }
      });
    },
    [socket, isConnected, userNickname],
  );

  const contextValue: SocketContextState = {
    messages,
    isConnected,
    sendMessage,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
