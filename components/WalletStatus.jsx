'use client';

import { useWallet, WALLET_STATES } from './WalletContext';
import Button from './Button';

export default function WalletStatus() {
  const { walletState, walletData, error, connectWallet, disconnectWallet } = useWallet();

  const getStateConfig = (state) => {
    switch (state) {
      case WALLET_STATES.DISCONNECTED:
        return {
          buttonText: 'Connect Wallet',
          variant: 'primary',
          helperText: 'Connect your Stellar wallet to access the platform',
          disabled: false,
          showAddress: false,
        };

      case WALLET_STATES.CONNECTING:
        return {
          buttonText: 'Connecting…',
          variant: 'primary',
          helperText: 'Please approve the connection in your wallet',
          loading: true,
          showAddress: false,
        };

      case WALLET_STATES.CONNECTED:
        return {
          buttonText: 'Disconnect',
          variant: 'secondary',
          helperText: `Connected to Stellar ${walletData?.network || 'public'}`,
          disabled: false,
          showAddress: true,
        };

      case WALLET_STATES.ERROR:
        return {
          buttonText: 'Retry Connection',
          variant: 'primary',
          helperText: error || 'Connection failed. Please try again.',
          disabled: false,
          showAddress: false,
        };

      case WALLET_STATES.WRONG_NETWORK:
        return {
          buttonText: 'Switch Network',
          variant: 'warning',
          helperText: 'Please switch to the Stellar public network',
          disabled: false,
          showAddress: false,
        };

      case WALLET_STATES.NO_WALLET:
        return {
          buttonText: 'Install Wallet',
          variant: 'external',
          helperText: 'No Stellar wallet detected. Install one to continue',
          disabled: false,
          showAddress: false,
        };
    }
  };

  const config = getStateConfig(walletState);

  const handleClick = () => {
    switch (walletState) {
      case WALLET_STATES.DISCONNECTED:
      case WALLET_STATES.ERROR:
      case WALLET_STATES.WRONG_NETWORK:
        connectWallet();
        break;

      case WALLET_STATES.CONNECTED:
        disconnectWallet();
        break;

      case WALLET_STATES.NO_WALLET:
        window.open('https://www.stellar.org/wallets', '_blank');
        break;
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
            walletState === WALLET_STATES.CONNECTED ? 'bg-green-500'
              : walletState === WALLET_STATES.CONNECTING ? 'bg-yellow-500 animate-pulse'
                : walletState === WALLET_STATES.ERROR || walletState === WALLET_STATES.WRONG_NETWORK ? 'bg-red-500'
                  : 'bg-slate-600'
          }`}
          aria-hidden="true"
        />

        {config.showAddress && walletData ? (
          <div className="flex flex-col">
            <span className="text-sm font-mono text-slate-300">{walletData.address}</span>
            <span className="text-xs text-slate-500">{walletData.balance}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400 max-w-xs">{config.helperText}</span>
        )}
      </div>

      <Button
        variant={config.variant}
        loading={config.loading}
        disabled={config.disabled}
        onClick={handleClick}
        aria-label={config.buttonText}
        aria-describedby="wallet-helper-text"
      >
        {config.buttonText}
      </Button>

      <div className="sr-only" role="status" aria-live="polite">
        Wallet status:
        {' '}
        {walletState}
        {walletData?.address && `. Connected as ${walletData.address}`}
        {error && `. Error: ${error}`}
      </div>

      <div id="wallet-helper-text" className="sr-only">
        {config.helperText}
      </div>
    </div>
  );
}

export { WALLET_STATES };