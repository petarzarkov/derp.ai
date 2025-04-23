import { Box, Button, useColorModeValue } from '@chakra-ui/react';
import { useState, useRef, useEffect } from 'react';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';

const MAX_COLLAPSED_HEIGHT_PX = 50;

export const UserMessageContent = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const expandButtonBg = useColorModeValue('primary.300', 'primary.400');
  const expandButtonHoverBg = useColorModeValue('primary.600', 'primary.300');

  useEffect(() => {
    setIsCollapsible(false);
    setIsExpanded(false);

    const timeoutId = setTimeout(() => {
      if (contentRef.current) {
        const exceedsThreshold = contentRef.current.scrollHeight > MAX_COLLAPSED_HEIGHT_PX;
        setIsCollapsible(exceedsThreshold);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
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
        transition="max-height 0.2s ease-out"
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
          bg={expandButtonBg}
          color="white"
          _hover={{ bg: expandButtonHoverBg }}
          leftIcon={isExpanded ? <MdExpandLess /> : <MdExpandMore />}
          mt={1}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      )}
    </>
  );
};
