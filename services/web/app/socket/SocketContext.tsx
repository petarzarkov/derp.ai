import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react'; // Added useContext
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
  isBotThinking: boolean; // <-- Add thinking state
  sendMessage: (messageText: string) => void;
}

// Create the context with an undefined default value
export const SocketContext = createContext<SocketContextState | undefined>(undefined);

// Define props for the provider
interface SocketProviderProps {
  children: ReactNode;
  serverUrl?: string; // Allow overriding server URL via prop
  userNickname?: string; // Allow passing user nickname via prop
  botNickname?: string; // Allow defining bot nickname
}

const DEFAULT_SERVER_URL = 'http://localhost:3033';
const DEFAULT_USER_NICKNAME = 'user';
const DEFAULT_BOT_NICKNAME = 'DerpAI'; // Define bot name

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  serverUrl = DEFAULT_SERVER_URL,
  userNickname = DEFAULT_USER_NICKNAME,
  botNickname = DEFAULT_BOT_NICKNAME, // Use prop or default
}) => {
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false); // <-- Initialize thinking state
  const [messages, setMessages] = useState<MessageProps[]>([
    // Initial message can be simpler now
    { text: 'Connecting...', nickname: 'system', time: Date.now() },
  ]);

  useEffect(() => {
    const newSocket = io(serverUrl, {
      // transports: ['websocket'], // Usually not needed unless specific proxy issues
      reconnectionAttempts: 5, // Example: Limit reconnection attempts
      timeout: 10000, // Connection timeout
    });
    setSocket(newSocket);

    const handleConnect = () => {
      setIsConnected(true);
      // Remove client-side welcome message generation
      setMessages((prev) => prev.filter((msg) => msg.nickname !== 'system'));
      // Server will now send the welcome message via 'chat' event
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setIsBotThinking(false); // Stop thinking if disconnected
      setMessages((prev) => [
        ...prev,
        { text: `Disconnected: ${reason}. Attempting to reconnect...`, nickname: 'error', time: Date.now() },
      ]);
    };

    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setIsBotThinking(false); // Stop thinking on connection error
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.nickname !== 'system');
        return [...filtered, { text: `Connection failed: ${error.message}.`, nickname: 'error', time: Date.now() }];
      });
    };

    const handleChatMessage = (receivedMsg: ServerChatMessage) => {
      // Check if it's a valid message structure
      if (receivedMsg && typeof receivedMsg.message === 'string' && typeof receivedMsg.nickname === 'string') {
        // If this message is from the bot, stop the "thinking" indicator
        if (receivedMsg.nickname === botNickname) {
          setIsBotThinking(false);
        }

        setMessages((prev) => [
          ...prev,
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
      setIsBotThinking(false); // Stop thinking on server error
      if (errorData && errorData.status === 'error' && typeof errorData.message === 'string') {
        setMessages((prev) => [
          ...prev,
          { text: `Server Error: ${errorData.message}`, nickname: 'error', time: Date.now() },
        ]);
      } else {
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
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.off('chat', handleChatMessage);
      newSocket.off('exception', handleException);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsBotThinking(false); // Reset on unmount
    };
  }, [serverUrl, botNickname]); // Add botNickname dependency if it can change

  const sendMessage = useCallback(
    (messageText: string) => {
      const trimmedMessage = messageText.trim();
      if (!trimmedMessage || !socket || !isConnected || isBotThinking) {
        // Prevent sending while bot is thinking
        return;
      }

      const messageToSend: ClientChatMessage = {
        nickname: userNickname,
        message: trimmedMessage,
        // Consider adding a client-side timestamp if needed for ordering
        // time: Date.now()
      };

      setMessages((prev) => [...prev, { text: messageToSend.message, nickname: userNickname, time: Date.now() }]);
      setIsBotThinking(true);
      socket.emit('chat', messageToSend, (/* Optional ACK handling */) => {
        // ACK handling remains the same
      });
    },
    [socket, isConnected, userNickname, isBotThinking, botNickname], // Added dependencies
  );

  const contextValue: SocketContextState = {
    messages,
    isConnected,
    isBotThinking,
    sendMessage,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
