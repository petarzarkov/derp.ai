import React, { useRef, useState, useEffect, lazy } from 'react';
import {
  Flex,
  Stack,
  Textarea,
  Spinner,
  IconButton,
  useColorModeValue,
  HStack,
  Text,
  Button,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Tooltip,
} from '@chakra-ui/react';
import { FiSend, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useSocket, useThemeProvider } from '@hooks';
import TextareaAutosize from 'react-textarea-autosize';
import { useConfig } from '../../hooks/useConfig';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { GiCoffeeCup } from 'react-icons/gi';

const Message = lazy(() => import('./Message'));

interface ChatBoxProps {
  isFixedInput?: boolean;
}

function ChatBox({ isFixedInput = false }: ChatBoxProps) {
  const {
    messages,
    isConnected,
    connectionStatus,
    isBotThinking,
    currentStatusMessage,
    sendMessage,
    setModelsToQuery,
  } = useSocket();
  const { theme } = useThemeProvider();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { models } = useConfig();

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  useEffect(() => {
    setSelectedModels(models);
  }, [models]);

  useEffect(() => {
    setModelsToQuery(selectedModels);
  }, [selectedModels, setModelsToQuery]);

  const scrollToBottom = () => {
    window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const statusCtx: Record<typeof connectionStatus, { color: string; text: string }> = {
    connected: { color: 'green.400', text: 'Connected' },
    connecting: { color: 'yellow.400', text: 'Connecting...' },
    reconnecting: { color: 'orange.400', text: 'Reconnecting...' },
    disconnected: { color: 'red.500', text: 'Disconnected' },
  };
  const { color: statusColor, text: statusText } = statusCtx[connectionStatus];

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    let shouldScroll = false;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.type === 'bot' && lastMessage.answers) {
      const hasStreamingAnswers = Object.values(lastMessage.answers).some((answer) => answer.status === 'streaming');
      const allAnswersComplete = Object.values(lastMessage.answers).every((answer) => answer.status === 'complete');

      if (hasStreamingAnswers || allAnswersComplete) {
        shouldScroll = true;
      }
    }

    if (shouldScroll) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim();
    if (trimmedMessage && isConnected && !isBotThinking && selectedModels.length > 0) {
      sendMessage(trimmedMessage);
      setMessageInput('');
      if (isFixedInput) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
    scrollToBottom();
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

  const handleModelSelect = (values: string | string[]) => {
    setSelectedModels(Array.isArray(values) ? values : [values]);
  };

  const linkBgColor = useColorModeValue('primary.500', 'primary.700');
  const hoverBgColor = useColorModeValue('primary.300', 'primary.500');
  const inputBgColor = useColorModeValue('white', 'primary.700');
  const inputPlaceholder =
    connectionStatus !== 'connected'
      ? 'Connecting...'
      : isBotThinking
        ? currentStatusMessage || 'Thinking...'
        : 'Enter a prompt here';

  if (isFixedInput) {
    const textareaMinHeight = '40px';
    const textareaMaxHeight = '200px';
    const expandedHeight = '300px';

    return (
      <Flex
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        pr={1}
        pl={2}
        transition="margin-left 0.2s ease-in-out"
        bg={useColorModeValue('primary.50', 'primary.900')}
        zIndex={5}
        justifyContent="center"
        alignItems="flex-end"
      >
        <Flex
          p={1}
          bg={inputBgColor}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={useColorModeValue('primary.200', 'primary.600')}
          alignItems="flex-end"
          w={{ base: '100%', sm: '95%', md: '90%', lg: '85%' }}
          maxW="container.xl"
          position="relative"
          minH={textareaMinHeight}
          flexDirection="column"
        >
          <HStack spacing={1} w="full" justifyContent="space-between" alignItems="center">
            <HStack spacing={1} alignItems="center">
              <Flex boxSize="8px" borderRadius="full" bg={statusColor} transition="background-color 0.3s ease" />
              <Text fontSize="xs" color={useColorModeValue('primary.600', 'whiteAlpha.600')}>
                {statusText}
              </Text>

              {models && models.length > 0 && (
                <Menu closeOnSelect={false} colorScheme={theme}>
                  <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="xs" variant="outline">
                    {`Models (${selectedModels.length})`}
                  </MenuButton>
                  <MenuList>
                    <MenuOptionGroup type="checkbox" value={selectedModels} onChange={handleModelSelect}>
                      {models.map((model) => (
                        <MenuItemOption key={model} value={model}>
                          {model}
                        </MenuItemOption>
                      ))}
                    </MenuOptionGroup>
                  </MenuList>
                </Menu>
              )}

              <Tooltip placement="top" label="Buy me a coffee" hasArrow>
                <IconButton
                  _hover={{
                    textDecoration: 'none',
                    bg: hoverBgColor,
                  }}
                  as={RouterLink}
                  m={0}
                  p={0}
                  to={'https://ko-fi.com/M4M3BQLQH'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={'Buy Me a Coffee at ko-fi.com'}
                  icon={<GiCoffeeCup size={22} />}
                  variant="ghost"
                  size="xs"
                  background={linkBgColor}
                />
              </Tooltip>
            </HStack>

            <IconButton
              size="xs"
              icon={isExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
              variant="ghost"
              aria-label={isExpanded ? 'Collapse input' : 'Expand input'}
              onClick={toggleExpand}
              zIndex={1}
            />
          </HStack>

          <Flex flex={1} position="relative" alignItems="flex-end" w="full">
            <Textarea
              p={1}
              as={TextareaAutosize}
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              flex={1}
              minHeight={textareaMinHeight}
              minRows={isExpanded ? 6 : 2}
              maxRows={isExpanded ? 20 : 6}
              height={isExpanded ? expandedHeight : undefined}
              maxH={isExpanded ? expandedHeight : textareaMaxHeight}
              overflowY="auto"
              resize="none"
              placeholder={inputPlaceholder}
              isDisabled={connectionStatus !== 'connected' || isBotThinking || selectedModels.length === 0}
              variant="unstyled"
              textAlign="left"
              pr="40px"
            />
          </Flex>

          <IconButton
            onClick={handleSendMessage}
            isDisabled={
              !messageInput.trim() || connectionStatus !== 'connected' || isBotThinking || selectedModels.length === 0
            }
            isLoading={isBotThinking}
            spinner={<Spinner size="xs" />}
            icon={<FiSend />}
            colorScheme="blue"
            size="sm"
            position="absolute"
            bottom="5px"
            right="5px"
            zIndex={1}
            borderRadius="md"
            aria-label={isBotThinking ? 'Sending message' : 'Send message'}
          />
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
      </Stack>
    </Flex>
  );
}

export default ChatBox;
