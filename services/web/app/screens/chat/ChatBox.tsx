import React, { useRef, useState, useEffect } from 'react';
import { Button, Flex, Heading, HStack, Stack, Text, useColorModeValue, Textarea, Spinner } from '@chakra-ui/react';
import { PiRobotLight } from 'react-icons/pi';
import { useSocket } from '@hooks';
import Message from './Message';

export function ChatBox() {
  const { messages, isConnected, isBotThinking, sendMessage } = useSocket();

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

  return (
    <Flex
      w="100%"
      h="100%"
      flexDirection="column"
      borderWidth="1px"
      rounded="3xl"
      overflow="hidden"
      bg={useColorModeValue('white', 'gray.700')}
      borderColor={useColorModeValue('gray.200', 'gray.600')}
    >
      <HStack
        p={4}
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
          <Flex boxSize="10px" borderRadius="full" bg={isConnected ? 'green.400' : 'red.400'} mr={2} />
          <Text fontSize="xs" color="whiteAlpha.800">
            {isConnected ? 'Connected' : 'Disconnected'}
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

        {isBotThinking && <Message text="Thinking..." nickname={'DerpAI'} time={Date.now()} />}

        <div ref={messagesEndRef} />
      </Stack>

      <HStack
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
          placeholder={!isConnected ? 'Connecting...' : isBotThinking ? 'DerpAI is thinking...' : 'Ask me anything...'}
          isDisabled={!isConnected || isBotThinking}
          variant="filled"
          _focus={{ borderColor: useColorModeValue('primary.500', 'primary.300') }}
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
          isDisabled={!messageInput.trim() || !isConnected || isBotThinking}
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
