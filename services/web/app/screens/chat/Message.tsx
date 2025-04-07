import { useColorModeValue, Flex, HStack, Text, Code, Box } from '@chakra-ui/react';
import type { MessageProps } from '../../socket/Chat.types';
import ReactMarkdown, { Components } from 'react-markdown';

const Message = ({ text, nickname, time }: MessageProps) => {
  const isUser = nickname === 'user';
  const isError = nickname === 'error';
  const isSystem = nickname === 'system';

  const align = isUser ? 'flex-end' : 'flex-start';

  // Define base colors
  const userBg = useColorModeValue('primary.700', 'primary.100');
  const userText = useColorModeValue('primary.100', 'primary.700');
  const botBg = useColorModeValue('green.700', 'green.100');
  const botText = useColorModeValue('green.100', 'green.700');
  const errorBg = useColorModeValue('red.600', 'red.300');
  const errorText = useColorModeValue('white', 'red.900');
  const systemBg = useColorModeValue('gray.500', 'gray.300');
  const systemText = useColorModeValue('white', 'gray.900');

  // Define specific colors for code elements (adjust as needed)
  const codeBlockBg = useColorModeValue('gray.100', 'gray.800'); // Background for ``` blocks
  const codeBlockText = useColorModeValue('gray.800', 'gray.100'); // Text color for ``` blocks
  const inlineCodeBg = useColorModeValue('gray.200', 'gray.600'); // Background for `inline` code
  const inlineCodeText = useColorModeValue('black', 'white'); // Text color for `inline` code

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
  const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  const markdownComponents: Components = {
    code(component) {
      const { className, children, ...props } = component;
      const match = /language-(\w+)/.exec(className || ''); // Extract language if specified (e.g., ```javascript)
      const lang = match ? match[1] : 'plaintext'; //
      // Handle block code (using ```)
      if ('inline' in component && component.inline === false) {
        return (
          <Box
            as="pre" // Use <pre> for semantic code blocks
            p={3} // Padding inside the block
            my={2} // Margin above/below the block
            bg={codeBlockBg} // Specific background for code blocks
            color={codeBlockText} // Specific text color for code blocks
            borderRadius="md"
            overflowX="auto" // Allow horizontal scrolling for long lines
            fontSize="sm" // Often looks better slightly smaller
            boxShadow="inner" // Subtle visual distinction
            data-language={lang}
          >
            <Code bg="transparent" {...props}>
              {String(children).replace(/\n$/, '')}
            </Code>
          </Box>
        );
      }
      // Handle inline code (using `)
      return (
        <Code bg={inlineCodeBg} color={inlineCodeText} px="0.3em" py="0.1em" borderRadius="sm" fontSize="sm" {...props}>
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
          {!isSystem ? nickname : ''}
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
