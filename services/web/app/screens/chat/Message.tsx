/* eslint-disable @typescript-eslint/no-unused-vars */
import { JSX, useEffect, useMemo, useRef, useState } from 'react';
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Spinner,
  Badge,
  Stack,
  useColorMode,
} from '@chakra-ui/react';
import type { MessageProps } from '../../socket/Chat.types';
import ReactMarkdown, { Components } from 'react-markdown';
import { FaCopy, FaCheck } from 'react-icons/fa';
import { UserMessageContent } from './UserMessageContent';
import { useThemeProvider } from '@hooks';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { MAX_COLLAPSED_HEIGHT_CODE_PX } from '../../config/const';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';

const Message = (props: MessageProps) => {
  const { theme } = useThemeProvider();
  const { type, nickname, time } = props;

  const { text } = props.type === 'user' && props.text ? { text: props.text } : { text: null };
  const { answers } = props.type === 'bot' && props.answers ? { answers: props.answers } : { answers: null };
  const isUser = type === 'user';

  const userBg = useColorModeValue('primary.700', 'primary.300');
  const userText = useColorModeValue('primary.100', 'primary.700');
  const errorBg = useColorModeValue('red.600', 'red.300');
  const errorText = useColorModeValue('white', 'red.900');
  const systemBg = useColorModeValue('primary.500', 'primary.300');
  const systemText = useColorModeValue('white', 'primary.900');
  const defaultBg = useColorModeValue('primary.300', 'primary.600');
  const defaultText = useColorModeValue('primary.600', 'primary.100');
  const defaultHover = useColorModeValue('primary.200', 'primary.500');
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
              bg={useColorModeValue('primary.200', 'primary.600')}
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

        const [isExpanded, setIsExpanded] = useState(false);
        const [isCollapsible, setIsCollapsible] = useState(false);
        const contentRef = useRef<HTMLDivElement>(null);
        const expandButtonBg = useColorModeValue('primary.300', 'primary.400');
        const expandButtonHoverBg = useColorModeValue('primary.600', 'primary.300');

        const { colorMode } = useColorMode();
        useEffect(() => {
          setIsCollapsible(false);
          setIsExpanded(false);

          const timeoutId = setTimeout(() => {
            if (contentRef.current) {
              const exceedsThreshold = contentRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT_CODE_PX;
              setIsCollapsible(exceedsThreshold);
            }
          }, 50);

          return () => clearTimeout(timeoutId);
        }, [text]);

        const toggleExpansion = () => {
          setIsExpanded(!isExpanded);
        };
        // Block Code Logic (with copy button)
        const { hasCopied, onCopy } = useClipboard(codeString);
        return (
          <Box
            as="pre"
            position="relative"
            bg={useColorModeValue('primary.100', 'primary.800')}
            color={useColorModeValue('primary.800', 'primary.100')}
            borderRadius="md"
            overflowX="auto"
            fontSize="sm"
            boxShadow="inner"
            data-language={lang}
            whiteSpace="pre-wrap" // wrap long lines
            wordBreak="break-all" // break long words if needed
            borderWidth="1px"
            borderColor={useColorModeValue('primary.200', 'primary.700')}
            ref={contentRef}
            maxHeight={isCollapsible && !isExpanded ? `${MAX_COLLAPSED_HEIGHT_CODE_PX}px` : 'none'}
            overflow="hidden"
            transition="max-height 0.2s ease-out"
          >
            {isCollapsible && (
              <IconButton
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                icon={isExpanded ? <MdExpandLess /> : <MdExpandMore />}
                size="sm"
                position="absolute"
                top="0.5rem"
                left="0.5rem"
                variant="ghost"
                onClick={toggleExpansion}
                bg={expandButtonBg}
                _hover={{ bg: expandButtonHoverBg }}
                zIndex="1"
              />
            )}
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

            <SyntaxHighlighter
              style={colorMode === 'light' ? atomOneLight : atomOneDark}
              language={lang}
              PreTag="div"
              showLineNumbers={false}
              customStyle={{
                padding: '16px',
                margin: '0',
                backgroundColor: useColorModeValue('primary.800', 'primary.100'),
                color: useColorModeValue('primary.100', 'primary.800'),
                borderRadius: 'md',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {codeString}
            </SyntaxHighlighter>
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

  const { tabs, tabPanels } = useMemo(() => {
    const generatedTabs: JSX.Element[] = [];
    const generatedTabPanels: JSX.Element[] = [];
    const answerStatusToBadgeColor = {
      waiting: 'yellow',
      streaming: 'blue',
      complete: 'green',
      error: 'red',
    } as const;

    if (answers) {
      Object.values(answers).forEach((answer, index) => {
        generatedTabs.push(
          <Stack key={`${index}-${answer.model}-${answer.provider}-tab`} _hover={{ bg: defaultHover }}>
            {(answer.status === 'streaming' || answer.status === 'waiting') && (
              <Spinner
                position={'absolute'}
                size="sm"
                speed="2.5s"
                emptyColor="gray.200"
                color="primary.500"
                m={0}
                p={0}
              />
            )}
            <Tab fontSize={'sm'}>
              <Heading size="sm" noOfLines={1} fontSize={'sm'} as="h6">
                {answer.model}
              </Heading>
            </Tab>
          </Stack>,
        );

        generatedTabPanels.push(
          <TabPanel key={`${answer.time}-${answer.model}-${answer.provider}-tab-panel`}>
            <Stack bg={defaultHover} borderRadius={'5px'} textAlign={'center'}>
              <Badge colorScheme={answerStatusToBadgeColor[answer.status]}>{answer.status}</Badge>
              <Heading size="sm" mb={2} as="h6">
                {answer.provider} - {answer.model}
              </Heading>
            </Stack>
            {<ReactMarkdown components={markdownComponents}>{answer.text}</ReactMarkdown>}
          </TabPanel>,
        );
      });
    }

    return { tabs: generatedTabs, tabPanels: generatedTabPanels };
  }, [answers, markdownComponents]);

  return (
    <Flex
      p={3}
      bg={bgColor}
      color={textColor}
      borderRadius="lg"
      w="fit-content"
      maxW="90%"
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
        <Box wordBreak="break-word" overflowX="hidden" fontSize="sm">
          {isUser && text ? (
            <UserMessageContent text={text} />
          ) : (
            <Tabs variant="line" colorScheme={theme} size={'sm'} align="start">
              <TabList>{tabs}</TabList>

              <TabPanels>{tabPanels}</TabPanels>
            </Tabs>
          )}
        </Box>
      </Flex>
    </Flex>
  );
};

export default Message;
