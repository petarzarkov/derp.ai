import React, { useRef, useState, useEffect } from 'react';
import { Button, Flex, Heading, HStack, Stack, Text, useColorModeValue, Textarea, Spinner } from '@chakra-ui/react';
import { PiRobotLight } from 'react-icons/pi';
import { useSocket } from '@hooks';
import Message from './Message';
import ThinkingMessage from './ThinkingMessage';

export function ChatBox() {
  const { messages, isConnected, connectionStatus, isBotThinking, botNickname, sendMessage } = useSocket();

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const scrollToBottom = () => {
    // Use timeout to allow DOM update before scrolling
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isBotThinking]);

  // Handle sending message using context function
  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim();
    if (trimmedMessage && isConnected && !isBotThinking) {
      sendMessage(trimmedMessage);
      setMessageInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const statusCtx: Record<typeof connectionStatus, { color: string; text: string }> = {
    connected: { color: 'green.400', text: 'Connected' },
    connecting: { color: 'yellow.400', text: 'Connecting...' },
    reconnecting: { color: 'orange.400', text: 'Reconnecting...' },
    disconnected: { color: 'red.500', text: 'Disconnected' },
  };
  const { color: statusColor, text: statusText } = statusCtx[connectionStatus];

  return (
    <Flex
      w="100%"
      h="100%"
      maxHeight={'900px'}
      flexDirection="column"
      borderWidth="1px"
      rounded="3xl"
      bg={useColorModeValue('white', 'gray.700')}
      borderColor={useColorModeValue('gray.200', 'gray.600')}
    >
      <HStack
        p={4}
        roundedTop="3xl"
        bg={useColorModeValue('primary.500', 'primary.600')}
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor={useColorModeValue('gray.200', 'gray.500')}
      >
        <Heading size="lg" color="white">
          <HStack>
            <PiRobotLight />
            <Text>DerpAI</Text>
          </HStack>
        </Heading>
        <Flex flex={1} justify="flex-end" align="center">
          <Flex boxSize="10px" borderRadius="full" bg={statusColor} mr={2} transition="background-color 0.3s ease" />
          <Text fontSize="xs" color="whiteAlpha.800">
            {statusText}
          </Text>
        </Flex>
      </HStack>

      <Stack
        px={4}
        py={4}
        overflowY="auto"
        flex={1}
        spacing={4}
        css={{
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: useColorModeValue('gray.300', 'gray.500'),
            borderRadius: '24px',
          },
        }}
      >
        <Flex flex={1} />

        {messages.map((msg, idx) => (
          <Message key={`msg-${idx}-${msg.time}-${msg.nickname}`} {...msg} />
        ))}

        {isBotThinking && <ThinkingMessage botName={botNickname} />}

        <div ref={messagesEndRef} />
      </Stack>

      <HStack
        roundedBottom="3xl"
        p={4}
        bg={useColorModeValue('primary.500', 'primary.600')}
        borderTopWidth="1px"
        borderColor={useColorModeValue('gray.200', 'gray.500')}
        flexShrink={0}
      >
        <Textarea
          ref={inputRef}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyDown}
          bg={useColorModeValue('white', 'gray.700')}
          placeholder={
            connectionStatus === 'connecting'
              ? 'Connecting...'
              : connectionStatus === 'connected'
                ? isBotThinking
                  ? `${botNickname || 'AI'} is thinking...`
                  : 'Ask me anything...'
                : connectionStatus === 'disconnected'
                  ? 'Disconnected. Trying to reconnect...'
                  : 'Connection failed.'
          }
          // Disable based on connection status and thinking state
          isDisabled={connectionStatus !== 'connected' || isBotThinking}
          variant="filled"
          _focus={{
            bg: useColorModeValue('white', 'gray.700'),
            borderColor: useColorModeValue('primary.500', 'primary.300'),
          }}
          overflowY="auto"
          resize="none"
          transition="height none"
        />
        <Button
          variant={isConnected ? 'solid' : 'outline'}
          bg={useColorModeValue('primary.300', 'primary.400')}
          color="white"
          _hover={{ bg: useColorModeValue('primary.600', 'primary.300') }}
          onClick={handleSendMessage}
          isDisabled={!messageInput.trim() || connectionStatus !== 'connected' || isBotThinking}
          isLoading={isBotThinking} // Show spinner on button while thinking
          spinner={<Spinner size="sm" />}
        >
          {isBotThinking ? '' : 'Ask'}
        </Button>
      </HStack>
    </Flex>
  );
}

export default ChatBox;
