import React, { createContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'; // Added useRef
import { io } from 'socket.io-client';
import type {
  SocketClient,
  MessageProps,
  ServerChatMessage,
  SocketExceptionData,
  ClientChatMessage,
} from './Chat.types';
import { useAuth } from '../auth/AuthContext';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface SocketContextState {
  messages: MessageProps[];
  isConnected: boolean;
  isBotThinking: boolean;
  connectionStatus: ConnectionStatus;
  sendMessage: (messageText: string) => void;
  botNickname: string | null;
}

export const SocketContext = createContext<SocketContextState | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  serverUrl: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, serverUrl }) => {
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [botNickname, setBotNickname] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const { isAuthenticated, currentUser } = useAuth();

  const userNickname = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  // Ref to hold the current bot nickname for access within event handlers
  const botNicknameRef = useRef(botNickname);
  useEffect(() => {
    botNicknameRef.current = botNickname;
  }, [botNickname]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setIsBotThinking(false);
        setConnectionStatus('disconnected');
        setMessages([]);
        setBotNickname(null);
      }
      return;
    }

    if (socket) {
      return;
    }
    setConnectionStatus('connecting');
    setMessages([]);
    setBotNickname(null);

    const newSocket = io(serverUrl, {
      requestTimeout: 10000,
      withCredentials: true,
    });
    setSocket(newSocket);

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionStatus(connectionStatus === 'disconnected' ? 'reconnecting' : 'connected');
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setIsBotThinking(false);
      console.warn('Socket disconnected', reason);
      setConnectionStatus('disconnected');
    };

    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setIsBotThinking(false);
      setConnectionStatus('disconnected');
      console.log(`Socket connection error`, error);
    };

    const handleChatMessage = (receivedMsg: ServerChatMessage) => {
      // Check if it's a valid message structure
      if (receivedMsg && typeof receivedMsg.message === 'string' && typeof receivedMsg.nickname === 'string') {
        // Use the ref to check against the latest bot nickname
        if (receivedMsg.nickname === botNicknameRef.current) {
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

    const handleInit = (receivedMsg: ServerChatMessage) => {
      // Check ref to prevent setting nickname multiple times if init is somehow emitted again
      if (!botNicknameRef.current) {
        setBotNickname(receivedMsg.nickname);
        // Add the init message directly to avoid duplication if also sent via 'chat'
        if (receivedMsg && typeof receivedMsg.message === 'string' && typeof receivedMsg.nickname === 'string') {
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
          console.warn('Received invalid init message format:', receivedMsg);
        }
      }
    };

    const handleException = (errorData: SocketExceptionData) => {
      setIsBotThinking(false);
      console.error('Socket exception:', errorData);
    };

    const handleReconnectAttempt = (attempt: number) => {
      console.log(`Socket attempting to reconnect... Attempt ${attempt}`);
      setConnectionStatus('reconnecting');
      setIsConnected(false);
      setIsBotThinking(false);
    };

    // Attach listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.io.on('reconnect_attempt', handleReconnectAttempt);

    // App listeners
    newSocket.on('init', handleInit);
    newSocket.on('chat', handleChatMessage);
    newSocket.on('exception', handleException);

    // Cleanup function
    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.io.off('reconnect_attempt', handleReconnectAttempt);

      newSocket.off('init', handleInit);
      newSocket.off('chat', handleChatMessage);
      newSocket.off('exception', handleException);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsBotThinking(false);
      setConnectionStatus('disconnected');
    };
  }, [serverUrl, isAuthenticated, currentUser]);

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
      };

      setMessages((prev) => [...prev, { text: messageToSend.message, nickname: userNickname, time: Date.now() }]);
      setIsBotThinking(true);
      socket.emit('chat', messageToSend, (/* Optional ACK handling */) => {
        // ACK handling remains the same
      });
    },
    [socket, isConnected, userNickname, isBotThinking, isAuthenticated],
  );

  const contextValue: SocketContextState = {
    messages,
    isConnected,
    connectionStatus,
    isBotThinking,
    botNickname,
    sendMessage,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
