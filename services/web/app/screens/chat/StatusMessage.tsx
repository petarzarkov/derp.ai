import React, { useState, useMemo } from 'react';
import Message from './Message';
import { useInterval } from '@chakra-ui/react';

const StatusMessage: React.FC<{ botName: string | null; statusText: string }> = ({ botName, statusText }) => {
  const [dots, setDots] = useState('.');
  const thinkingStartTime = useMemo(() => Date.now(), []);

  const updateDotsCallback = () => {
    setDots((prevDots) => {
      // Cycle through '.', '..', '...'
      return prevDots.length >= 3 ? '.' : prevDots + '.';
    });
  };

  useInterval(updateDotsCallback, 500);

  return <Message text={`${statusText}${dots}`} nickname={botName || 'DerpAI'} time={thinkingStartTime} />;
};

export default StatusMessage;
