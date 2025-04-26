import { useRef } from 'react';
import { Flex, Box } from '@chakra-ui/react';
import { SocketProvider } from '../../socket/SocketProvider';
import { ScrollContextProvider } from '../../scroll/ScrollContext';
import { ChatBox } from './ChatBox';
import { useConfig } from '../../hooks/useConfig';

export function ChatPage() {
  const scrollableMessagesRef = useRef<HTMLDivElement>(null);
  const { serverUrl } = useConfig();

  return (
    <SocketProvider serverUrl={serverUrl}>
      <Flex
        direction="column"
        flexGrow={1}
        w="100%"
        alignItems="center"
        // Padding to account for fixed header and fixed input from Layout
        pt="80px" // Match or slightly exceed Layout's header padding
        pb="120px" // Match or slightly exceed Layout's fixed input padding
        px={4}
      >
        <Box
          w={{ base: '100%', sm: '95%', md: '90%', lg: '85%' }}
          maxW="container.xl"
          flexGrow={1}
          display="flex"
          flexDirection="column"
        >
          <Flex
            ref={scrollableMessagesRef} // Attach the ref here
            flexGrow={1} // Makes this area take up available space
            overflowY="auto" // Makes this area scrollable
            direction="column"
            pb={4}
          >
            <ScrollContextProvider scrollableRef={scrollableMessagesRef}>
              <ChatBox isFixedInput={false} />
            </ScrollContextProvider>
          </Flex>
        </Box>
      </Flex>
      <ChatBox isFixedInput={true} />
    </SocketProvider>
  );
}
