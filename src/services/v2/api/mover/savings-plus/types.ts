export enum DepositExecution {
  Direct = 'direct',
  Bridged = 'bridged'
}

export type DepositWithBridgeTransactionData = {
  execution: DepositExecution.Bridged;
  bridgeTxAddress: string;
  bridgeTxData: string;
  estimatedReceived: string;
  depositFee: string;
  bridgeFee: string;
  targetChainRelay: string;
};

export const isDepositWithBridgeTransactionData = (
  data?: DepositTransactionData
): data is DepositWithBridgeTransactionData => {
  return data !== undefined && data.execution === DepositExecution.Bridged;
};

export type DepositOnlyTransactionData = {
  execution: DepositExecution.Direct;
  depositPoolAddress: string;
  depositFee: string;
};

export type DepositTransactionData =
  | DepositWithBridgeTransactionData
  | DepositOnlyTransactionData;

export enum WithdrawExecution {
  Direct = 'direct',
  Backend = 'backend'
}

export enum WithdrawReasonCode {
  PoolInAnotherChain = 'POOL_IN_ANOTHER_CHAIN'
}

export type WithdrawComplexTransactionData = {
  execution: WithdrawExecution.Backend;
  reasonCode: WithdrawReasonCode;
  estimatedReceived: string;
  withdrawFee: string;
  bridgeFee: string;
};

export const isWithdrawComplexTransactionData = (
  data?: WithdrawTransactionData
): data is WithdrawComplexTransactionData => {
  return data !== undefined && data.execution === WithdrawExecution.Backend;
};

export type WithdrawOnlyTransactionData = {
  execution: WithdrawExecution.Direct;
  withdrawPoolAddress: string;
  withdrawFee: string;
};

export enum WithdrawAPIErrorCode {
  UnsupportedChain = 'UNSUPPORTED_CHAIN'
}

export type WithdrawTransactionData =
  | WithdrawComplexTransactionData
  | WithdrawOnlyTransactionData;

export type SavingsPlusMonthBalanceItem = {
  type: 'savings_plus_month_balance_item';
  balance: number;
  earned: number;
  snapshotTimestamp: number;
  year: number;
  month: number;
};

export type SavingsPlusActionHistoryItem = {
  type: 'deposit' | 'withdraw';
  amount: number;
  txId: string;
  block: number;
  timestamp: number;
};

export type SavingsPlusInfo = {
  currentBalance: number;
  currentPoolBalance: number;
  earnedTotal: number;
  earnedThisMonth: number;
  last12MonthsBalances: Array<SavingsPlusMonthBalanceItem>;
  actionHistory: Array<SavingsPlusActionHistoryItem> | undefined;
  avg30DaysAPY: number;
};

export type SavingsPlusInfoAPIResponse = {
  currentBalance: number;
  currentPoolBalance: number;
  earnedTotal: number;
  earnedThisMonth: number;
  last12MonthsBalances: Array<{
    balance: number;
    earned: number;
    snapshotTimestamp: number;
    year: number;
    month: number;
  }>;
  actionHistory: Array<{
    type: 'deposit' | 'withdraw';
    amount: number;
    txId: string;
    block: number;
    timestamp: number;
  }>;
  avg30DaysAPY: number;
};
