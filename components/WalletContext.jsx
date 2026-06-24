'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from './ToastProvider';

export const WALLET_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  WRONG_NETWORK: 'wrong_network',
  NO_WALLET: 'no_wallet',
};

const mockWalletData = {
  address: 'GABC...XYZ123',
  network: 'public',
  balance: '1,234.56 XLM',
};

const WalletContext = createContext(null);

/**
 * Provides global Stellar wallet state and connection actions.
 *
 * Wraps the existing mocked wallet flow so any component (including the
 * invoice-detail "Fund this invoice" button) can read or trigger the same
 * connection lifecycle used by WalletStatus.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Subtree that needs wallet access.
 */
export function WalletProvider({ children }) {
  const [walletState, setWalletState] = useState(WALLET_STATES.DISCONNECTED);
  const [walletData, setWalletData] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();

  const connectWallet = useCallback(async () => {
    setWalletState(WALLET_STATES.CONNECTING);
    setError(null);

    return new Promise((resolve) => {
      setTimeout(() => {
        const scenarios = ['success', 'error', 'wrong_network', 'no_wallet'];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        switch (scenario) {
          case 'success':
            setWalletState(WALLET_STATES.CONNECTED);
            setWalletData(mockWalletData);
            toast.success('Wallet connected successfully.', 'Wallet connected');
            resolve({ success: true });
            break;

          case 'error':
            setWalletState(WALLET_STATES.ERROR);
            setError('Failed to connect to wallet. Please try again.');
            toast.error(
              'Failed to connect to wallet. Please try again.',
              'Connection failed',
            );
            resolve({ success: false, error: 'Failed to connect to wallet. Please try again.' });
            break;

          case 'wrong_network':
            setWalletState(WALLET_STATES.WRONG_NETWORK);
            setError('Wallet is connected to testnet. Please switch to public network.');
            toast.error(
              'Wallet is connected to testnet. Please switch to public network.',
              'Wrong network',
            );
            resolve({
              success: false,
              error: 'Wallet is connected to testnet. Please switch to public network.',
            });
            break;

          case 'no_wallet':
            setWalletState(WALLET_STATES.NO_WALLET);
            setError('No Stellar wallet detected. Install one to continue.');
            toast.error('No Stellar wallet detected. Install one to continue.', 'No wallet');
            resolve({ success: false, error: 'No Stellar wallet detected. Install one to continue.' });
            break;
        }
      }, 1500);
    });
  }, [toast]);

  const disconnectWallet = useCallback(() => {
    setWalletState(WALLET_STATES.DISCONNECTED);
    setWalletData(null);
    setError(null);
  }, []);

  const value = {
    walletState,
    walletData,
    error,
    connectWallet,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Read the current wallet state and connection actions.
 *
 * @returns {object} `{ walletState, walletData, error, connectWallet, disconnectWallet }`
 * @throws {Error} When called outside of a `<WalletProvider>`.
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
