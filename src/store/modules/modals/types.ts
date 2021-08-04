import { Token } from '@/wallet/types';

export const enum Modal {
  SavingsDeposit = 'savings-deposit-modal',
  SavingsWithdraw = 'savings-withdraw-modal',
  SearchToken = 'search-token-modal',
  Swap = 'swap-modal',
  Transaction = 'transaction-modal',
  TreasuryIncreaseBoost = 'treasury-increase-boost',
  TreasuryDecreaseBoost = 'treasury-decrease-boost',
  TreasuryClaimAndBurn = 'treasury-claim-and-burn'
}

export interface TModalParams {
  [Modal.SavingsDeposit]: {
    payloadType: undefined;
    returnType: undefined;
  };
  [Modal.SavingsWithdraw]: {
    payloadType: undefined;
    returnType: undefined;
  };
  [Modal.SearchToken]: {
    payloadType: {
      useWalletTokens: boolean;
      excludeTokens: Array<Token>;
      treasuryOnly: boolean;
      forceTokenArray: Array<Token>;
    };
    returnType: Token | undefined;
  };
  [Modal.Swap]: {
    payloadType: undefined;
    returnType: undefined;
  };
  [Modal.Transaction]: {
    payloadType: undefined;
    returnType: undefined;
  };
  [Modal.TreasuryIncreaseBoost]: {
    payloadType: undefined;
    returnType: undefined;
  };
  [Modal.TreasuryDecreaseBoost]: {
    payloadType: undefined;
    returnType: undefined;
  };
  [Modal.TreasuryClaimAndBurn]: {
    payloadType: undefined;
    returnType: undefined;
  };
}

export type TModalKey = keyof TModalParams;
export type TModalPayload<K extends TModalKey> = TModalParams[K]['payloadType'];
export type TModalReturn<K extends TModalKey> = TModalParams[K]['returnType'];

export type ModalState<K extends TModalKey> = {
  isDisplayed: boolean;
  isVisible: boolean;
  stackDepth: number;
  waitForResult: boolean;

  payload?: TModalPayload<K>;
  resolver?: (args: TModalReturn<K>) => Promise<TModalReturn<K>>;
};

export type ModalsStoreState = {
  state: Record<TModalKey, ModalState<TModalKey>>;
  stack: Array<TModalKey>;
};