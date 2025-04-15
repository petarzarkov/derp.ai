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

const Message = ({ text, nickname, time }: MessageProps) => {
  const isUser = nickname !== 'error' && nickname !== 'system' && nickname !== 'DerpAI';
  const isError = nickname === 'error';

  const colorStyles = {
    [isUser ? nickname : 'user']: {
      bg: useColorModeValue('primary.700', 'primary.100'),
      text: useColorModeValue('primary.100', 'primary.700'),
    },
    error: {
      bg: useColorModeValue('red.600', 'red.300'),
      text: useColorModeValue('white', 'red.900'),
    },
    system: {
      bg: useColorModeValue('gray.500', 'gray.300'),
      text: useColorModeValue('white', 'gray.900'),
    },
    default: {
      bg: useColorModeValue('primary.300', 'primary.900'),
      text: useColorModeValue('primary.900', 'primary.100'),
    },
  };

  const currentStyle = colorStyles[nickname as keyof typeof colorStyles] || colorStyles.default;
  const bgColor = currentStyle.bg;
  const textColor = currentStyle.text;
  const align = isUser ? 'flex-end' : 'flex-start';

  const date = new Date(time);
  const formattedTime = `${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const markdownComponents: Components = {
    code(component) {
      const { className, children, ...props } = component;
      const match = /language-(\w+)/.exec(className || '');
      const lang = match ? match[1] : 'plaintext';
      // Process children once
      const codeString = String(children).replace(/\n$/, '');

      // Detect block code by checking for newline character
      if (codeString.includes('\n')) {
        const { hasCopied, onCopy } = useClipboard(codeString);

        return (
          <Box
            as="pre"
            position="relative" // Make this the positioning context
            p={4}
            pt={8} // Keep padding for button
            my={2}
            bg={useColorModeValue('gray.100', 'gray.800')}
            color={useColorModeValue('gray.800', 'gray.100')}
            borderRadius="md"
            overflowX="auto" // Still useful if long unwrappable lines exist
            fontSize="sm"
            boxShadow="inner"
            data-language={lang}
            whiteSpace="pre-wrap" // Enable wrapping
            wordBreak="break-word" // Allow breaking long words/lines
            borderWidth="1px" // Add border
            borderColor={useColorModeValue('gray.200', 'gray.700')} // Use defined border color
          >
            {/* Button goes INSIDE the pre box */}
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
            <Code
              bg="transparent"
              borderRadius="md"
              display="block"
              className={className?.startsWith('language-') ? undefined : className}
            >
              {codeString}
            </Code>
          </Box>
        );
      }

      return (
        <Code
          bg={useColorModeValue('gray.200', 'gray.600')}
          color={useColorModeValue('black', 'white')}
          px="0.4em"
          py="0.2em"
          borderRadius="sm"
          fontSize="sm"
          whiteSpace="normal" // Allow wrapping for inline code
          wordBreak="break-word" // Allow breaking long words/lines
          {...props} // Spread props here
          className={className?.startsWith('language-') ? undefined : className}
        >
          {codeString}
        </Code>
      );
    },
    p({ children, ...props }) {
      return (
        <Text mb={1} {...props}>
          {children}
        </Text>
      );
    },
    ul: ({ children, ...props }) => (
      <UnorderedList ml={4} mb={2} {...props}>
        {children}
      </UnorderedList>
    ),
    ol: ({ children, ...props }) => (
      <OrderedList ml={4} mb={2} {...props}>
        {children}
      </OrderedList>
    ),
    li: ({ children, ...props }) => <ListItem {...props}>{children}</ListItem>,
    h1: ({ children, ...props }) => (
      <Heading as="h1" size="lg" my={3} {...props}>
        {children}
      </Heading>
    ),
    h2: ({ children, ...props }) => (
      <Heading as="h2" size="md" my={2} {...props}>
        {children}
      </Heading>
    ),
  };

  return (
    <Flex
      p={3}
      bg={bgColor}
      color={textColor}
      borderRadius="lg"
      w="fit-content"
      maxW="80%"
      alignSelf={align}
      boxShadow="sm"
      flexDirection="column"
    >
      <HStack justify="space-between" w="full" mb={1}>
        <Text fontSize="xs" fontWeight="bold" opacity={0.9}>
          {nickname}
        </Text>
        {!!time && (
          <Text fontSize="xs" opacity={0.7}>
            {formattedTime}
          </Text>
        )}
      </HStack>
      <Flex align="flex-start" flexDirection="row">
        {isError && (
          <Text fontWeight="bold" mr={2} mt="1px" display="inline-block">
            ⚠️
          </Text>
        )}
        <Box wordBreak="break-word" width="100%" overflowX="hidden">
          <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Message;
