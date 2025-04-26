import React, { useRef, useState, useEffect } from 'react';
import { Flex, Stack, Textarea, Spinner, IconButton, useColorModeValue, HStack, Text } from '@chakra-ui/react';
import { FiSend, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { useSocket } from '@hooks';
import { useScrollContext } from '../../scroll/ScrollContext';
import Message from './Message';
import StatusMessage from './StatusMessage';
import TextareaAutosize from 'react-textarea-autosize';

interface ChatBoxProps {
  isFixedInput?: boolean;
}

export function ChatBox({ isFixedInput = false }: ChatBoxProps) {
  const { messages, isConnected, connectionStatus, isBotThinking, botNickname, currentStatusMessage, sendMessage } =
    useSocket();
  const { scrollableRef } = !isFixedInput ? useScrollContext() : { scrollableRef: { current: null } };

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (messagesEndRef.current && scrollableRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  };

  const statusCtx: Record<typeof connectionStatus, { color: string; text: string }> = {
    connected: { color: 'green.400', text: 'Connected' },
    connecting: { color: 'yellow.400', text: 'Connecting...' },
    reconnecting: { color: 'orange.400', text: 'Reconnecting...' },
    disconnected: { color: 'red.500', text: 'Disconnected' },
  };
  const { color: statusColor, text: statusText } = statusCtx[connectionStatus];

  useEffect(() => {
    if (!isFixedInput) {
      scrollToBottom();
    }
  }, [messages, isBotThinking, isFixedInput]);

  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim();
    if (trimmedMessage && isConnected && !isBotThinking) {
      sendMessage(trimmedMessage);
      setMessageInput('');
      if (isFixedInput) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const inputBgColor = useColorModeValue('white', 'gray.700');
  const inputPlaceholder =
    connectionStatus !== 'connected'
      ? 'Connecting...'
      : isBotThinking
        ? currentStatusMessage || 'Thinking...'
        : 'Enter a prompt here';

  if (isFixedInput) {
    const textareaMinHeight = '40px';
    const textareaMaxHeight = '200px'; // Define a max height for auto-sizing
    const expandedHeight = '300px';

    return (
      <Flex
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        transition="margin-left 0.2s ease-in-out"
        p={4}
        bg={useColorModeValue('gray.50', 'gray.900')}
        zIndex={5}
        justifyContent="center"
        alignItems="flex-end"
      >
        <Flex
          p={2}
          bg={inputBgColor}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
          alignItems="flex-end"
          w={{ base: '100%', sm: '95%', md: '90%', lg: '85%' }}
          maxW="container.xl"
          position="relative"
          minH={textareaMinHeight}
        >
          <HStack spacing={1} position="absolute" top={2} left={4} zIndex={1} alignItems="center">
            <Flex boxSize="8px" borderRadius="full" bg={statusColor} transition="background-color 0.3s ease" />
            <Text fontSize="xs" color={useColorModeValue('gray.600', 'whiteAlpha.600')}>
              {statusText}
            </Text>
          </HStack>

          <IconButton
            size="xs"
            icon={isExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
            variant="ghost"
            aria-label={isExpanded ? 'Collapse input' : 'Expand input'}
            onClick={toggleExpand}
            position="absolute"
            top={1}
            right={1}
            zIndex={1}
          />

          <Flex flex={1} position="relative" alignItems="flex-end" pt={6}>
            <Textarea
              as={TextareaAutosize}
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              flex={1}
              minRows={1} // Minimum rows for TextareaAutosize
              maxRows={isExpanded ? undefined : 10} // Auto-size up to ~10 rows when not expanded
              height={isExpanded ? expandedHeight : undefined} // Apply fixed height when expanded
              maxH={isExpanded ? expandedHeight : textareaMaxHeight} // Apply max height for scrolling
              overflowY="auto" // Ensure scrollbar appears
              resize="none"
              placeholder={inputPlaceholder}
              isDisabled={connectionStatus !== 'connected'}
              variant="unstyled"
              textAlign="left"
            />

            <IconButton
              onClick={handleSendMessage}
              isDisabled={!messageInput.trim() || connectionStatus !== 'connected' || isBotThinking}
              isLoading={isBotThinking}
              spinner={<Spinner size="xs" />}
              icon={<FiSend />}
              colorScheme="blue"
              size="sm"
              position="absolute"
              bottom="5px"
              right="15px"
              zIndex={1}
              borderRadius="md"
              aria-label={isBotThinking ? 'Sending message' : 'Send message'}
            />
          </Flex>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" flexGrow={1} justifyContent="flex-end">
      <Stack spacing={4} flexGrow={1}>
        {messages.map((msg, idx) => (
          <Message key={`msg-${idx}-${msg.time}-${msg.nickname}`} {...msg} />
        ))}

        {isBotThinking && currentStatusMessage && (
          <StatusMessage botName={botNickname} statusText={currentStatusMessage} />
        )}

        <div ref={messagesEndRef} />
      </Stack>
    </Flex>
  );
}
