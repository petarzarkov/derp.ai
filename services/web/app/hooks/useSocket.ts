import { useContext } from 'react';
import { SocketContext, SocketContextState } from '../socket/SocketContext';

export const useSocket = (): SocketContextState => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
