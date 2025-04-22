/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo } from 'react';
import {
  useColorModeValue,
  Flex,
  HStack,
  Text,
  Code,
  Box,
  useClipboard,
  Tooltip,
  IconButton,
  UnorderedList,
  OrderedList,
  Heading,
  ListItem,
} from '@chakra-ui/react';
import type { MessageProps } from '../../socket/Chat.types';
import ReactMarkdown, { Components } from 'react-markdown';
import { FaCopy, FaCheck } from 'react-icons/fa';
import { UserMessageContent } from './UserMessageContent';

const Message = ({ text, nickname, time }: MessageProps) => {
  const isUser = nickname !== 'error' && nickname !== 'system' && nickname !== 'DerpAI';
  const isError = nickname === 'error';

  // ---- FIX 1: Call Hooks at Top Level for colorStyles ----
  const userBg = useColorModeValue('primary.700', 'primary.300');
  const userText = useColorModeValue('primary.100', 'primary.700');
  const errorBg = useColorModeValue('red.600', 'red.300');
  const errorText = useColorModeValue('white', 'red.900');
  const systemBg = useColorModeValue('gray.500', 'gray.300');
  const systemText = useColorModeValue('white', 'gray.900');
  const defaultBg = useColorModeValue('primary.300', 'primary.600');
  const defaultText = useColorModeValue('primary.600', 'primary.100');
  const colorStyles = useMemo(
    () => ({
      user: { bg: userBg, text: userText },
      error: { bg: errorBg, text: errorText },
      system: { bg: systemBg, text: systemText },
      default: { bg: defaultBg, text: defaultText },
    }),
    [userBg, userText, errorBg, errorText, systemBg, systemText, defaultBg, defaultText],
  );

  const styleKey = isUser ? 'user' : (nickname as keyof typeof colorStyles);
  const currentStyle = colorStyles[styleKey] || colorStyles.default;

  const bgColor = currentStyle.bg;
  const textColor = currentStyle.text;
  const align = isUser ? 'flex-end' : 'flex-start';

  const date = new Date(time);
  const formattedTime = `${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  // Memoize markdownComponents if they don't depend on props changing per message
  const markdownComponents = useMemo<Components>(
    () => ({
      code(component) {
        const { className, children, node, ...props } = component;
        const match = /language-(\w+)/.exec(className || '');
        const lang = match ? match[1] : 'plaintext';
        const codeString = String(children).replace(/\n$/, '');

        // Check if it's an inline code by looking at the parent node type
        // react-markdown passes the 'node' property which represents the AST node
        const isInlineCode = node?.position?.start.line === node?.position?.end.line && !codeString.includes('\n');

        if (isInlineCode) {
          return (
            <Code
              bg={useColorModeValue('gray.200', 'gray.600')}
              color={useColorModeValue('black', 'white')}
              px="0.4em"
              py="0.2em"
              borderRadius="sm"
              fontSize="sm"
              whiteSpace="normal"
              wordBreak="break-word"
              {...props}
            >
              {codeString}
            </Code>
          );
        }

        // Block Code Logic (with copy button)
        const { hasCopied, onCopy } = useClipboard(codeString);
        return (
          <Box
            as="pre"
            position="relative"
            p={4}
            pt={8}
            my={2}
            bg={useColorModeValue('gray.100', 'gray.800')}
            color={useColorModeValue('gray.800', 'gray.100')}
            borderRadius="md"
            overflowX="auto"
            fontSize="sm"
            boxShadow="inner"
            data-language={lang}
            whiteSpace="pre-wrap" // wrap long lines
            wordBreak="break-all" // break long words if needed
            borderWidth="1px"
            borderColor={useColorModeValue('gray.200', 'gray.700')}
          >
            <Tooltip label={hasCopied ? 'Copied!' : 'Copy code'} placement="top" hasArrow>
              <IconButton
                aria-label={hasCopied ? 'Copied!' : 'Copy code'}
                icon={hasCopied ? <FaCheck /> : <FaCopy />}
                size="sm"
                position="absolute"
                top="0.5rem"
                right="0.5rem"
                colorScheme={hasCopied ? 'green' : 'gray'}
                variant="ghost"
                onClick={onCopy}
                zIndex="1"
              />
            </Tooltip>
            <Code bg="transparent" display="block" className={`language-${lang}`}>
              {codeString}
            </Code>
          </Box>
        );
      },
      p: ({ children, node, ...props }) => (
        <Text mb={2} {...props}>
          {children}
        </Text>
      ),
      ul: ({ children, node, ...props }) => (
        <UnorderedList ml={5} my={2} spacing={1} {...props}>
          {children}
        </UnorderedList>
      ),
      ol: ({ children, node, ...props }) => (
        <OrderedList ml={5} my={2} spacing={1} {...props}>
          {children}
        </OrderedList>
      ),
      li: ({ children, node, ...props }) => (
        <ListItem pb={1} {...props}>
          {children}
        </ListItem>
      ),
      h1: ({ children, node, ...props }) => (
        <Heading as="h1" size="lg" my={4} pb={1} borderBottomWidth="1px" {...props}>
          {children}
        </Heading>
      ),
      h2: ({ children, node, ...props }) => (
        <Heading as="h2" size="md" my={3} pb={1} borderBottomWidth="1px" {...props}>
          {children}
        </Heading>
      ),
      h3: ({ children, node, ...props }) => (
        <Heading as="h3" size="sm" my={2} {...props}>
          {children}
        </Heading>
      ),
      h4: ({ children, ...props }) => (
        <Heading as="h4" size="xs" my={2} {...props}>
          {children}
        </Heading>
      ),
    }),
    [useColorModeValue, useClipboard],
  );

  return (
    <Flex
      p={3}
      bg={bgColor}
      color={textColor}
      borderRadius="lg"
      w="fit-content"
      maxW="80%" // Max width for message bubble
      alignSelf={align}
      boxShadow="sm"
      flexDirection="column"
    >
      <HStack justify="space-between" w="full" mb={isUser ? 0 : 1}>
        {!isUser && (
          <Text fontSize="xs" fontWeight="bold" opacity={0.9}>
            {nickname}
          </Text>
        )}
        {isUser && <Box flex={1} />}
        {!!time && (
          <Text fontSize="xs" opacity={0.7} ml={isUser ? 0 : 2}>
            {formattedTime}
          </Text>
        )}
      </HStack>

      <Flex align="flex-start" flexDirection="row" mt={isUser ? 1 : 0}>
        {isError && (
          <Text fontWeight="bold" mr={2} mt="1px" display="inline-block">
            ⚠️
          </Text>
        )}
        <Box wordBreak="break-word" overflowX="hidden" fontSize="sm">
          {isUser ? (
            <UserMessageContent text={text} />
          ) : (
            <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
          )}
        </Box>
      </Flex>
    </Flex>
  );
};

export default Message;
