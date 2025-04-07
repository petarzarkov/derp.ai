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
import ReactMarkdown, { Components } from 'react-markdown'; // Import ExtraProps for typing
import { FaCopy, FaCheck } from 'react-icons/fa';

const Message = ({ text, nickname, time }: MessageProps) => {
  const isUser = nickname === 'user';
  const isError = nickname === 'error';
  const isSystem = nickname === 'system';

  const align = isUser ? 'flex-end' : 'flex-start';

  const userBg = useColorModeValue('primary.700', 'primary.100');
  const userText = useColorModeValue('primary.100', 'primary.700');
  const botBg = useColorModeValue('primary.300', 'primary.900');
  const botText = useColorModeValue('primary.900', 'primary.100');
  const errorBg = useColorModeValue('red.600', 'red.300');
  const errorText = useColorModeValue('white', 'red.900');
  const systemBg = useColorModeValue('gray.500', 'gray.300');
  const systemText = useColorModeValue('white', 'gray.900');

  const codeBlockBg = useColorModeValue('gray.100', 'gray.800');
  const codeBlockText = useColorModeValue('gray.800', 'gray.100');
  const inlineCodeBg = useColorModeValue('gray.200', 'gray.600');
  const inlineCodeText = useColorModeValue('black', 'white');

  let bgColor = botBg;
  let textColor = botText;
  if (isUser) {
    bgColor = userBg;
    textColor = userText;
  } else if (isError) {
    bgColor = errorBg;
    textColor = errorText;
  } else if (isSystem) {
    bgColor = systemBg;
    textColor = systemText;
  }

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

      if ('inline' in component && component.inline === false) {
        const codeString = String(children).replace(/\n$/, '');
        const { hasCopied, onCopy } = useClipboard(codeString);

        return (
          <Box position="relative" my={2}>
            <Box
              as="pre"
              p={4}
              pt={8}
              my={2}
              bg={codeBlockBg}
              color={codeBlockText}
              borderRadius="md"
              overflowX="auto"
              fontSize="sm"
              boxShadow="inner"
              data-language={lang}
            >
              <Code
                bg="transparent"
                borderRadius="md"
                className={className?.startsWith('language-') ? undefined : className}
              >
                {codeString}
              </Code>
            </Box>
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
          </Box>
        );
      }

      // Handle inline code
      return (
        <Code
          bg={inlineCodeBg}
          color={inlineCodeText}
          px="0.4em"
          py="0.2em"
          borderRadius="sm"
          fontSize="sm"
          {...props}
          // Ensure className doesn't mess things up
          className={className?.startsWith('language-') ? undefined : className}
        >
          {String(children)}
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
    ul: ({ children }) => (
      <UnorderedList ml={4} mb={2}>
        {children}
      </UnorderedList>
    ),
    ol: ({ children }) => (
      <OrderedList ml={4} mb={2}>
        {children}
      </OrderedList>
    ),
    li: ({ children }) => <ListItem>{children}</ListItem>,
    h1: ({ children }) => (
      <Heading as="h1" size="lg" my={3}>
        {children}
      </Heading>
    ),
    h2: ({ children }) => (
      <Heading as="h2" size="md" my={2}>
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
          {!isSystem && !isUser ? nickname : ''}
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
        <Box wordBreak="break-word" width="100%">
          <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Message;
