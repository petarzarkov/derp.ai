import React, { useState, useMemo } from 'react';
import Message from './Message';
import { useInterval } from '@chakra-ui/react';

const ThinkingMessage: React.FC = () => {
  const baseText = 'Thinking';
  const [dots, setDots] = useState('.');
  const thinkingStartTime = useMemo(() => Date.now(), []);

  const updateDotsCallback = () => {
    setDots((prevDots) => {
      // Cycle through '.', '..', '...'
      return prevDots.length >= 3 ? '.' : prevDots + '.';
    });
  };

  useInterval(updateDotsCallback, 500);

  return <Message text={`${baseText}${dots}`} nickname={'DerpAI'} time={thinkingStartTime} />;
};

export default ThinkingMessage;
