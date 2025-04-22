import { Box, Button, useColorModeValue } from '@chakra-ui/react';
import { useState, useRef, useEffect } from 'react';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';

const MAX_COLLAPSED_HEIGHT_PX = 100;

export const UserMessageContent = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Effect to check height and determine if collapsing is needed
  useEffect(() => {
    // Reset on text change initially
    setIsCollapsible(false);
    setIsExpanded(false); // Collapse by default when text changes

    if (contentRef.current) {
      // Use requestAnimationFrame to ensure styles are applied before measuring
      requestAnimationFrame(() => {
        if (contentRef.current) {
          const exceedsThreshold = contentRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT_PX;
          setIsCollapsible(exceedsThreshold);
        }
      });
    }
    // Intentionally run only when text changes, not isExpanded/isCollapsible
  }, [text]);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <Box
        ref={contentRef}
        maxHeight={isCollapsible && !isExpanded ? `${MAX_COLLAPSED_HEIGHT_PX}px` : 'none'}
        overflow="hidden"
        transition="max-height 0.2s ease-out" // Smooth transition
        // Preserve line breaks and allow wrapping for plain user text
        whiteSpace="pre-wrap"
        wordBreak="break-word"
      >
        {text}
      </Box>
      {isCollapsible && (
        <Button
          variant="ghost"
          size="xs"
          fontWeight="normal"
          onClick={toggleExpansion}
          bg={useColorModeValue('primary.300', 'primary.400')}
          color="white"
          _hover={{ bg: useColorModeValue('primary.600', 'primary.300') }}
          leftIcon={isExpanded ? <MdExpandLess /> : <MdExpandMore />}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      )}
    </>
  );
};
