import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { io } from 'socket.io-client';
import type {
  SocketClient,
  MessageProps,
  ServerChatMessage,
  SocketExceptionData,
  ClientChatMessage,
  ServerStatusMessage,
  ServerInitMessage,
} from './Chat.types';
import { ConnectionStatus, SocketContext, SocketContextState } from './SocketContext';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@chakra-ui/react';
import { useConfig } from '../hooks/useConfig';

export interface SocketProviderProps {
  children: ReactNode;
  serverUrl: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, serverUrl }) => {
  const toast = useToast();
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { appName, models } = useConfig();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [currentStatusMessage, setCurrentStatusMessage] = useState<string | null>(null);
  const { isAuthenticated, currentUser } = useAuth();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [modelsToQuery, setModelsToQuery] = useState<string[]>(models);

  const userNickname = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (
      messages.length === 0 &&
      currentUser?.latestChatMessages &&
      currentUser.latestChatMessages?.[1] &&
      'answer' in currentUser.latestChatMessages[1]
    ) {
      const initialMessages = currentUser.latestChatMessages.flatMap(
        (msg) =>
          [
            {
              type: 'user',
              // TODO: backwards compatible for previous version, delete in near future
              text:
                'message' in msg.answer && typeof msg.answer.message === 'string'
                  ? msg.answer.message
                  : msg.question.prompt,
              nickname: msg.question.nickname,
              time: msg.question.time,
            },
            {
              type: 'bot',
              answers:
                // TODO backwards compatible for previous version, delete in near future
                'message' in msg.answer && typeof msg.answer.message === 'string'
                  ? [{ text: msg.answer.message, time: msg.answer.time, provider: 'google', model: 'gemini-2.0-flash' }]
                  : msg.answer.answers,
              nickname: msg.answer.nickname,
              time: msg.answer.time,
            },
          ] as const,
      );
      setMessages(initialMessages);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setIsBotThinking(false);
        setConnectionStatus('disconnected');
        setMessages([]);
        setCurrentStatusMessage(null);
      }
      return;
    }

    if (socket) {
      return;
    }
    setConnectionStatus('connecting');

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

    const handleServerMessage = (receivedMsg: ServerChatMessage) => {
      // Check if it's a valid message structure
      if (receivedMsg && typeof receivedMsg.answers && typeof receivedMsg.nickname === 'string') {
        // Use the ref to check against the latest bot nickname
        if (receivedMsg.nickname === appName) {
          setIsBotThinking(false);
        }

        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            answers: receivedMsg.answers,
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

    const handleInit = (receivedMsg: ServerInitMessage) => {
      if (receivedMsg && typeof receivedMsg.message === 'string' && receivedMsg.nickname === appName) {
        toast({
          title: receivedMsg.message,
          status: 'info',
          duration: 2000,
          isClosable: true,
          position: 'top-left',
          orientation: 'vertical',
          variant: 'solid',
        });
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
        if (toast.isActive(statusData.id)) {
          toast.update(statusData.id, {
            title: statusData.message,
            status: statusData.status || 'info',
            duration: 2000,
          });
        } else {
          toast({
            id: statusData.id,
            title: statusData.message,
            status: statusData.status || 'info',
            duration: 2000,
            isClosable: true,
            position: 'top-right',
            orientation: 'vertical',
            variant: 'subtle',
          });
        }

        setCurrentStatusMessage(statusData.message);
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
    newSocket.on('chat', handleServerMessage);
    newSocket.on('exception', handleException);
    newSocket.on('statusUpdate', handleStatusUpdate);

    // Cleanup function
    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.io.off('reconnect_attempt', handleReconnectAttempt);

      newSocket.off('init', handleInit);
      newSocket.off('chat', handleServerMessage);
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
        prompt: trimmedMessage,
        time: Date.now(),
        models: modelsToQuery,
      };

      setMessages((prev) => [
        ...prev,
        { text: messageToSend.prompt, nickname: userNickname, time: messageToSend.time, type: 'user' },
      ]);
      setIsBotThinking(true);
      setCurrentStatusMessage('Thinking');

      socket.emit('chat', messageToSend);
    },
    [socket, isConnected, userNickname, isBotThinking, isAuthenticated, modelsToQuery],
  );

  const contextValue: SocketContextState = {
    messages,
    isConnected,
    connectionStatus,
    isBotThinking,
    currentStatusMessage,
    sendMessage,
    setModelsToQuery,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
