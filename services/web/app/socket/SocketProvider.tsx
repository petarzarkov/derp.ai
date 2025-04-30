import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { io } from 'socket.io-client';
import type {
  SocketClient,
  MessageProps,
  SocketExceptionData,
  ClientChatMessage,
  ServerStatusMessage,
  ServerInitMessage,
  ServerChatChunkMessage,
  ServerChatEndMessage,
  ServerChatErrorMessage,
} from './Chat.types';
import { ConnectionStatus, SocketContext, SocketContextState } from './SocketContext';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@chakra-ui/react';
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
  const [thinkingModels, setThinkingModels] = useState<Record<string, boolean> | null>(null);
  const [currentStatusMessage, setCurrentStatusMessage] = useState<string | null>(null);
  const { isAuthenticated, currentUser } = useAuth();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [modelsToQuery, setModelsToQuery] = useState<string[]>(defaultModels);

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
              queryId: msg.question.queryId,
            },
            {
              type: 'bot',
              answers:
                // TODO backwards compatible for previous version, delete in near future
                'message' in msg.answer && typeof msg.answer.message === 'string'
                  ? {
                      'gemini-2.0-flash': {
                        text: msg.answer.message,
                        time: msg.answer.time,
                        provider: 'google',
                        model: 'gemini-2.0-flash',
                        status: 'complete',
                      } as const,
                    }
                  : Object.fromEntries(
                      msg.answer.answers.map((answer) => [
                        answer.model,
                        {
                          text: answer.text,
                          time: answer.time,
                          provider: answer.provider,
                          model: answer.model,
                          status: answer.status,
                        },
                      ]),
                    ),
              nickname: msg.answer.nickname,
              time: msg.answer.time,
              queryId: msg.question.queryId,
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
        setThinkingModels(null);
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
      setThinkingModels(null);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setThinkingModels(null);
      console.warn('Socket disconnected', reason);
      setConnectionStatus('disconnected');
      setCurrentStatusMessage(null);
      toast.closeAll();
    };

    const handleConnectError = (error: Error) => {
      setIsConnected(false);
      setThinkingModels(null);
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

    const handleChatChunk = (receivedMsg: ServerChatChunkMessage) => {
      setMessages((prevMessages) => {
        // Find the bot message associated with this queryId
        const messageIndex = prevMessages.findIndex((msg) => msg.type === 'bot' && msg.queryId === receivedMsg.queryId);

        if (messageIndex === -1) {
          console.warn(
            `Received chunk for unknown queryId: ${receivedMsg.queryId}. Chunk: "${receivedMsg.text.slice(0, 50)}..."`,
          );
          // Potentially create a new message entry if this is the first chunk received and the placeholder wasn't added
          // (less ideal, should rely on sendMessage adding the placeholder)
          return prevMessages; // Don't update if message not found
        }

        const messageToUpdate = prevMessages[messageIndex];
        if (messageToUpdate.type !== 'bot') return prevMessages; // Should not happen based on findIndex

        // Update the specific model's answer within the answers map
        const updatedAnswers = {
          ...messageToUpdate.answers,
          [receivedMsg.model]: {
            ...messageToUpdate.answers[receivedMsg.model], // Keep existing props
            model: receivedMsg.model, // Ensure model is set
            provider: messageToUpdate.answers[receivedMsg.model]?.provider || receivedMsg.model, // Keep provider if known
            text: (messageToUpdate.answers[receivedMsg.model]?.text || '') + receivedMsg.text, // Append text
            status: 'streaming' as const, // Set status to streaming
            time: null, // Time is null while streaming
          },
        };

        // Return new messages array with the updated message
        return [
          ...prevMessages.slice(0, messageIndex),
          { ...messageToUpdate, answers: updatedAnswers },
          ...prevMessages.slice(messageIndex + 1),
        ];
      });

      // Update thinking state: this model is definitely thinking/streaming
      setThinkingModels((prev) => ({ ...prev, [receivedMsg.model]: true }));
      setCurrentStatusMessage(`Streaming from ${receivedMsg.model}...`); // Update status message
    };

    const handleChatEnd = (receivedMsg: ServerChatEndMessage) => {
      setMessages((prevMessages) => {
        const messageIndex = prevMessages.findIndex((msg) => msg.type === 'bot' && msg.queryId === receivedMsg.queryId);

        if (messageIndex === -1) {
          console.warn(`Received end for unknown queryId: ${receivedMsg.queryId}. Model: ${receivedMsg.model}`);
          return prevMessages;
        }

        const messageToUpdate = prevMessages[messageIndex];
        if (messageToUpdate.type !== 'bot') return prevMessages;

        // Update the specific model's answer status and time
        const updatedAnswers = {
          ...messageToUpdate.answers,
          [receivedMsg.model]: {
            ...messageToUpdate.answers[receivedMsg.model], // Keep existing props (text, provider)
            status: 'complete' as const, // Set status to complete
            time: receivedMsg.time, // Set final time
          },
        };

        // Return new messages array with the updated message
        return [
          ...prevMessages.slice(0, messageIndex),
          { ...messageToUpdate, answers: updatedAnswers },
          ...prevMessages.slice(messageIndex + 1),
        ];
      });

      // Update thinking state: this model is done
      setThinkingModels((prev) => ({ ...prev, [receivedMsg.model]: false }));
      // Update overall status message if this was the last thinking model
      setThinkingModels((prev) => {
        const nextThinkingModels = { ...prev, [receivedMsg.model]: false };
        if (Object.values(nextThinkingModels).every((status) => !status)) {
          setCurrentStatusMessage(null); // No models thinking
        } else {
          // Find remaining thinking models and update status message
          const stillThinking = Object.keys(nextThinkingModels).filter((model) => nextThinkingModels[model]);
          setCurrentStatusMessage(`Thinking: ${stillThinking.join(', ')}...`);
        }
        return nextThinkingModels;
      });
    };

    const handleChatError = (receivedMsg: ServerChatErrorMessage) => {
      setMessages((prevMessages) => {
        // Find the bot message associated with this queryId
        const messageIndex = prevMessages.findIndex((msg) => msg.type === 'bot' && msg.queryId === receivedMsg.queryId);

        if (messageIndex === -1) {
          console.warn(
            `Received error for unknown queryId: ${receivedMsg.queryId}. Model: ${receivedMsg.model}`,
            receivedMsg.error,
          );
          return prevMessages;
        }

        const messageToUpdate = prevMessages[messageIndex];
        if (messageToUpdate.type !== 'bot') return prevMessages;

        // Update the specific model's answer status, time, and text with error
        const updatedAnswers = {
          ...messageToUpdate.answers,
          [receivedMsg.model]: {
            ...messageToUpdate.answers[receivedMsg.model], // Keep existing props (like initial empty text)
            status: 'error' as const, // Set status to error
            time: receivedMsg.time, // Set error time
            text: messageToUpdate.answers[receivedMsg.model]?.text || `Error: ${receivedMsg.error}`, // Append error or show error
          },
        };

        // Return new messages array with the updated message
        return [
          ...prevMessages.slice(0, messageIndex),
          { ...messageToUpdate, answers: updatedAnswers },
          ...prevMessages.slice(messageIndex + 1),
        ];
      });

      // Update thinking state: this model is done (with error)
      setThinkingModels((prev) => {
        const nextThinkingModels = { ...prev, [receivedMsg.model]: false };
        if (Object.values(nextThinkingModels).every((status) => !status)) {
          setCurrentStatusMessage(null); // No models thinking
        } else {
          // Find remaining thinking models and update status message
          const stillThinking = Object.keys(nextThinkingModels).filter((model) => nextThinkingModels[model]);
          setCurrentStatusMessage(`Thinking: ${stillThinking.join(', ')}...`);
        }
        return nextThinkingModels;
      });

      // Optionally show a toast for the error
      toast({
        id: `chat-error-${receivedMsg.queryId}-${receivedMsg.model}`, // Unique ID for toast
        title: `Error from ${receivedMsg.model}`,
        description: receivedMsg.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    };

    const handleException = (errorData: SocketExceptionData) => {
      setThinkingModels(null);
      setCurrentStatusMessage('An error occurred...');
      console.error('Socket exception:', errorData);
    };

    const handleReconnectAttempt = (attempt: number) => {
      console.log(`Socket attempting to reconnect... Attempt ${attempt}`);
      setConnectionStatus('reconnecting');
      setIsConnected(false);
      setThinkingModels(null);
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
    // Streaming listeners
    newSocket.on('streamChunk', handleChatChunk);
    newSocket.on('streamEnd', handleChatEnd);
    newSocket.on('streamError', handleChatError);
    newSocket.on('statusUpdate', handleStatusUpdate);
    newSocket.on('exception', handleException);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.io.off('reconnect_attempt', handleReconnectAttempt);

      newSocket.off('init', handleInit);
      newSocket.off('statusUpdate', handleStatusUpdate);
      newSocket.off('exception', handleException);
      newSocket.off('chatChunk', handleChatChunk);
      newSocket.off('chatEnd', handleChatEnd);
      newSocket.off('chatError', handleChatError);

      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setThinkingModels(null);
      setConnectionStatus('disconnected');
      setCurrentStatusMessage(null);
      toast.closeAll();
    };
  }, [serverUrl, isAuthenticated, currentUser]);

  const sendMessage = useCallback(
    (messageText: string) => {
      const trimmedMessage = messageText.trim();
      if (!trimmedMessage || !socket || !isConnected || !!thinkingModels) {
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

      // Add the user message to the state immediately.
      // Use the queryId so the echoed message from the server can update it.
      setMessages((prev) => [
        ...prev,
        {
          type: 'user',
          text: messageToSend.prompt,
          nickname: userNickname,
          time: messageToSend.time,
          queryId: messageToSend.queryId,
        },
        // Add a placeholder bot message entry for this queryId.
        // Chunks will update the 'answers' map within this entry.
        {
          type: 'bot',
          queryId: messageToSend.queryId,
          nickname: appName, // Or botName from context
          time: Date.now(), // Or messageToSend.time
          answers: {}, // Initialize with empty answers
        } as MessageProps, // Cast as MessageProps
      ]);

      // Set the thinking state for all selected models
      const initialThinkingState = modelsToQuery.reduce(
        (acc, model) => {
          acc[model] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setThinkingModels(initialThinkingState);
      setCurrentStatusMessage(`Thinking: ${modelsToQuery.join(', ')}...`);

      socket.emit('chat-stream', messageToSend);
    },
    [socket, isConnected, userNickname, modelsToQuery, thinkingModels, appName],
  );

  const isBotThinking = (thinkingModels && Object.values(thinkingModels).some((isThinking) => isThinking)) || false;

  const contextValue: SocketContextState = {
    messages,
    isConnected,
    connectionStatus,
    thinkingModels,
    isBotThinking,
    currentStatusMessage,
    sendMessage,
    setModelsToQuery,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
