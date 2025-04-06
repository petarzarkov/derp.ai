import { useColorModeValue, Flex, HStack, Text } from '@chakra-ui/react';
import type { MessageProps } from '../../socket/Chat.types';

const Message = ({ text, nickname, time }: MessageProps) => {
  const isUser = nickname === 'user'; // Assuming 'user' nickname comes from provider correctly
  const isError = nickname === 'error';
  const isSystem = nickname === 'system'; // Added for connecting messages etc.

  // Determine alignment
  const align = isUser ? 'flex-end' : 'flex-start';

  // Define colors
  const userBg = useColorModeValue('primary.700', 'primary.100');
  const userText = useColorModeValue('primary.100', 'primary.700');
  const botBg = useColorModeValue('green.700', 'green.100');
  const botText = useColorModeValue('green.100', 'green.700');
  const errorBg = useColorModeValue('red.600', 'red.300');
  const errorText = useColorModeValue('white', 'red.900');
  const systemBg = useColorModeValue('gray.500', 'gray.300'); // Style for system messages
  const systemText = useColorModeValue('white', 'gray.900');

  // Select colors
  let bgColor = botBg; // Default
  let textColor = botText; // Default
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

  return (
    <Flex
      p={3}
      bg={bgColor}
      color={textColor}
      borderRadius="lg"
      w="fit-content"
      maxW="80%"
      alignSelf={align}
      wordBreak="break-word"
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
      <Flex align="center">
        {' '}
        {isError && (
          <Text fontWeight="bold" mr={2} display="inline-block">
            ⚠️
          </Text>
        )}
        <Text>{text}</Text>
      </Flex>
    </Flex>
  );
};

export default Message;
