import React, { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { io } from 'socket.io-client';
import type {
  SocketClient,
  MessageProps,
  ServerChatMessage,
  SocketExceptionData,
  ClientChatMessage,
  ServerStatusMessage,
} from './Chat.types';
import { ConnectionStatus, SocketContext, SocketContextState } from './SocketContext';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@chakra-ui/react';

export interface SocketProviderProps {
  children: ReactNode;
  serverUrl: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, serverUrl }) => {
  const toast = useToast();
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [botNickname, setBotNickname] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [currentStatusMessage, setCurrentStatusMessage] = useState<string | null>(null);

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
        setCurrentStatusMessage(null);
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
      setCurrentStatusMessage('An error occurred...');
      console.error('Socket exception:', errorData);
    };

    const handleReconnectAttempt = (attempt: number) => {
      console.log(`Socket attempting to reconnect... Attempt ${attempt}`);
      setConnectionStatus('reconnecting');
      setIsConnected(false);
      setIsBotThinking(false);
    };

    const handleStatusUpdate = (statusData: ServerStatusMessage) => {
      if (statusData && typeof statusData.message === 'string') {
        if (statusData.nickname === botNicknameRef.current) {
          toast({
            title: statusData.message,
            status: statusData.status || 'info',
            duration: 5000,
            isClosable: true,
            position: 'top-right',
            orientation: 'vertical',
            variant: 'subtle',
          });
          setCurrentStatusMessage(statusData.message);
        }
      } else {
        console.warn('Received invalid status update format:', statusData);
      }
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
    newSocket.on('statusUpdate', handleStatusUpdate);

    // Cleanup function
    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.io.off('reconnect_attempt', handleReconnectAttempt);

      newSocket.off('init', handleInit);
      newSocket.off('chat', handleChatMessage);
      newSocket.off('exception', handleException);
      newSocket.off('statusUpdate', handleStatusUpdate);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsBotThinking(false);
      setConnectionStatus('disconnected');
      setCurrentStatusMessage(null);
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
      setCurrentStatusMessage('Thinking');
      socket.emit('chat', messageToSend);
    },
    [socket, isConnected, userNickname, isBotThinking, isAuthenticated],
  );

  const contextValue: SocketContextState = {
    messages,
    isConnected,
    connectionStatus,
    isBotThinking,
    currentStatusMessage,
    botNickname,
    sendMessage,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
