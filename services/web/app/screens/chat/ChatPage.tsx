import { lazy, useRef } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import { SocketProvider } from '../../socket/SocketProvider';
import { useConfig } from '../../hooks/useConfig';

const ChatBox = lazy(() => import('./ChatBox'));

export function ChatPage() {
  const scrollableMessagesRef = useRef<HTMLDivElement>(null);
  const { serverUrl } = useConfig();

  return (
    <SocketProvider serverUrl={serverUrl}>
      <Flex direction="column" flexGrow={1} w="100%" alignItems="center" pt="80px" pb="120px" px={4}>
        <Box
          w={{ base: '100%', sm: '95%', md: '90%', lg: '85%' }}
          maxW="container.xl"
          flexGrow={1}
          display="flex"
          flexDirection="column"
        >
          <Flex ref={scrollableMessagesRef} flexGrow={1} overflowY="auto" direction="column" pb={4}>
            <ChatBox isFixedInput={false} />
          </Flex>
        </Box>
      </Flex>
      <ChatBox isFixedInput={true} />
    </SocketProvider>
  );
}
