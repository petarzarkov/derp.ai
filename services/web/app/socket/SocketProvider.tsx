import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { io } from 'socket.io-client';
import type {
  SocketClient,
  MessageProps,
  SocketExceptionData,
  ClientChatMessage,
  ServerInitMessage,
  ServerChatChunkMessage,
  ServerChatEndMessage,
  ServerChatErrorMessage,
  AIAnswer,
} from './Chat.types';
import { ConnectionStatus, SocketContext, SocketContextState } from './SocketContext';
import { useAuth } from '../hooks/useAuth';
import { Spinner, useToast } from '@chakra-ui/react';
import { useConfig } from '../hooks/useConfig';
import { v4 as uuidv4 } from 'uuid';

export interface SocketProviderProps {
  children: ReactNode;
  serverUrl: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, serverUrl }) => {
  const toast = useToast();
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { appName, models: defaultModels } = useConfig();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [currentStatusMessage, setCurrentStatusMessage] = useState<string | null>(null);
  const { isAuthenticated, currentUser } = useAuth();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [modelsToQuery, setModelsToQuery] = useState<string[]>(defaultModels);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const userNickname = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  // Initialize messages when user data is available (and messages are empty)
  useEffect(() => {
    if (messages.length === 0 && currentUser?.latestChatMessages) {
      setIsLoadingHistory(true);

      // Use requestIdleCallback or setTimeout to avoid blocking the main thread
      const loadMessages = () => {
        try {
          const initialMessages = currentUser.latestChatMessages.flatMap((msg) => {
            // Optimize by creating a minimal answer object first
            const baseAnswers = Object.fromEntries(
              msg.answer.answers.map((answer) => [
                answer.model,
                {
                  text: '', // Start with empty text
                  time: answer.time,
                  provider: answer.provider,
                  model: answer.model,
                  status: answer.status || 'complete',
                },
              ]),
            );

            return [
              {
                type: 'user',
                text: msg.question.prompt,
                nickname: msg.question.nickname,
                time: msg.question.time,
                queryId: msg.question.queryId,
              },
              {
                type: 'bot',
                answers: baseAnswers,
                nickname: msg.answer.nickname,
                time: msg.answer.time,
                queryId: msg.question.queryId,
              },
            ] as const;
          });

          setMessages(initialMessages);

          // Now populate the text content in a non-blocking way
          setTimeout(() => {
            setMessages((prev) => {
              return prev.map((msg) => {
                if (msg.type !== 'bot') return msg;

                const updatedAnswers = Object.fromEntries(
                  Object.entries(msg.answers).map(([model, answer]) => {
                    const originalAnswer = currentUser.latestChatMessages
                      .find((m) => m.question.queryId === msg.queryId)
                      ?.answer.answers.find((a) => a.model === model);

                    return [
                      model,
                      {
                        ...answer,
                        text: originalAnswer?.text || answer.text,
                      },
                    ];
                  }),
                );

                return {
                  ...msg,
                  answers: updatedAnswers,
                };
              });
            });
          }, 0);
        } finally {
          setIsLoadingHistory(false);
        }
      };

      // Use requestIdleCallback if available, otherwise fall back to setTimeout
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadMessages, { timeout: 5000 });
      } else {
        setTimeout(loadMessages, 0);
      }
    }
  }, [currentUser?.latestChatMessages]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
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
      setIsBotThinking(false);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setIsBotThinking(false);
      console.warn('Socket disconnected', reason);
      setConnectionStatus('disconnected');
      setCurrentStatusMessage(null);
      toast.closeAll();
    };

    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setIsBotThinking(false);
      setConnectionStatus('disconnected');
      console.warn(`Socket connection error`, error);
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

    const updateBotMessageAnswer = (
      queryId: string,
      model: string,
      updateFn: (existingAnswer: AIAnswer) => AIAnswer,
    ) => {
      setMessages((prevMessages) => {
        const messageIndex = prevMessages.findIndex((msg) => msg.type === 'bot' && msg.queryId === queryId);

        if (messageIndex === -1) {
          console.warn(`Message with queryId ${queryId} not found.`);
          return prevMessages;
        }

        const messageToUpdate = prevMessages[messageIndex];
        if (messageToUpdate.type !== 'bot') return prevMessages;

        const updatedAnswers = {
          ...messageToUpdate.answers,
          [model]: updateFn(messageToUpdate.answers[model] || {}),
        };

        return [
          ...prevMessages.slice(0, messageIndex),
          { ...messageToUpdate, answers: updatedAnswers },
          ...prevMessages.slice(messageIndex + 1),
        ];
      });
    };

    const handleChatChunk = (receivedMsg: ServerChatChunkMessage) => {
      updateBotMessageAnswer(receivedMsg.queryId, receivedMsg.model, (existingAnswer) => ({
        ...existingAnswer,
        model: receivedMsg.model,
        provider: existingAnswer?.provider || receivedMsg.model,
        text: (existingAnswer?.text || '') + receivedMsg.text,
        status: 'streaming',
        time: null,
      }));

      setCurrentStatusMessage(`Streaming from ${receivedMsg.model}...`);
    };

    const handleChatEnd = (receivedMsg: ServerChatEndMessage) => {
      updateBotMessageAnswer(receivedMsg.queryId, receivedMsg.model, (existingAnswer) => ({
        ...existingAnswer,
        status: existingAnswer.status === 'error' ? 'error' : 'complete',
        time: receivedMsg.time,
      }));
      setIsBotThinking(false);
    };

    const handleChatError = (receivedMsg: ServerChatErrorMessage) => {
      updateBotMessageAnswer(receivedMsg.queryId, receivedMsg.model, (existingAnswer) => ({
        ...existingAnswer,
        status: 'error',
        time: receivedMsg.time,
        text: `Error: ${receivedMsg.error}`,
      }));

      toast({
        id: `chat-error-${receivedMsg.queryId}-${receivedMsg.model}`,
        title: `Error from ${receivedMsg.model}`,
        description: receivedMsg.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
      setIsBotThinking(false);
    };

    const handleException = (errorData: SocketExceptionData) => {
      setCurrentStatusMessage('An error occurred...');
      console.error('Socket exception:', errorData);
    };

    const handleReconnectAttempt = (attempt: number) => {
      console.log(`Socket attempting to reconnect... Attempt ${attempt}`);
      setConnectionStatus('reconnecting');
      setIsConnected(false);
    };

    // Attach listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.io.on('reconnect_attempt', handleReconnectAttempt);

    // App listeners
    newSocket.on('init', handleInit);
    // Streaming listeners
    newSocket.on('streamChunk', handleChatChunk);
    newSocket.on('streamEnd', handleChatEnd);
    newSocket.on('streamError', handleChatError);
    newSocket.on('exception', handleException);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.io.off('reconnect_attempt', handleReconnectAttempt);

      newSocket.off('init', handleInit);
      newSocket.off('exception', handleException);
      newSocket.off('streamChunk', handleChatChunk);
      newSocket.off('streamEnd', handleChatEnd);
      newSocket.off('streamError', handleChatError);

      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setCurrentStatusMessage(null);
    };
  }, [serverUrl, isAuthenticated, currentUser]);

  const sendMessage = useCallback(
    (messageText: string) => {
      const trimmedMessage = messageText.trim();
      if (!trimmedMessage || !socket || !isConnected || isBotThinking) {
        return;
      }

      // Generate a unique query ID for this message turn
      const queryId = uuidv4();

      const messageToSend: ClientChatMessage = {
        nickname: userNickname,
        prompt: trimmedMessage,
        time: Date.now(),
        models: modelsToQuery,
        queryId: queryId,
      };

      setMessages((prev) => [
        ...prev,
        {
          type: 'user',
          text: messageToSend.prompt,
          nickname: userNickname,
          time: messageToSend.time,
          queryId: messageToSend.queryId,
        },
        {
          type: 'bot',
          queryId: messageToSend.queryId,
          nickname: appName,
          time: messageToSend.time,
          answers: Object.fromEntries(
            modelsToQuery.map((model) => [
              model,
              {
                text: `${model} thinking...`,
                time: messageToSend.time,
                provider: 'prompt',
                model: model,
                status: 'waiting',
              },
            ]),
          ),
        },
      ]);

      setIsBotThinking(true);
      setCurrentStatusMessage(`Thinking: ${modelsToQuery.join(', ')}...`);

      socket.emit('chat-stream', messageToSend);
    },
    [socket, isConnected, userNickname, modelsToQuery, appName],
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

  if (isLoadingHistory) {
    return <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />;
  }

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
