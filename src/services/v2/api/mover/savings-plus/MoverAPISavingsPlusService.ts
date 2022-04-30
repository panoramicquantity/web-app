import axios, { AxiosInstance } from 'axios';

import { MoverError } from '@/services/v2';
import {
  MoverAPIError,
  MoverAPIService,
  MoverAPISuccessfulResponse
} from '@/services/v2/api/mover';
import { InvalidNetworkForOperationError } from '@/services/v2/on-chain/mover/savings-plus';
import { isFeatureEnabled } from '@/settings';
import { getNetwork, Network } from '@/utils/networkTypes';
import { getUSDCAssetData } from '@/wallet/references/data';
import { SmallTokenInfo } from '@/wallet/types';

import {
  DepositExecution,
  DepositTransactionData,
  SavingsPlusActionHistoryItem,
  SavingsPlusInfo,
  SavingsPlusInfoAPIResponse,
  SavingsPlusMonthBalanceItem,
  WithdrawAPIErrorCode,
  WithdrawExecution,
  WithdrawTransactionData
} from './types';

export class MoverAPISavingsPlusService extends MoverAPIService {
  protected baseURL: string;
  protected readonly client: AxiosInstance;
  protected readonly apiviewClient: AxiosInstance;
  protected readonly sentryCategoryPrefix = 'savings-plus.api.service';
  protected readonly usdcAssetData: SmallTokenInfo;
  protected static readonly isFieldsReducerEnabled = isFeatureEnabled(
    'isMoverAPISavingsPlusServiceFieldsReducerEnabled'
  );

  constructor(currentAddress: string, network: Network) {
    super(currentAddress, network);
    this.baseURL = this.lookupBaseURL();
    this.client = this.applyAxiosInterceptors(
      axios.create({
        baseURL: this.baseURL
      })
    );
    this.apiviewClient = this.applyAxiosInterceptors(
      axios.create({
        baseURL: 'https://apiview.viamover.com/api/v1/savingsplus'
      })
    );
    this.usdcAssetData = getUSDCAssetData(network);
  }

  public async getInfo(): Promise<SavingsPlusInfo> {
    const data = (
      await this.apiviewClient.get<
        MoverAPISuccessfulResponse<SavingsPlusInfoAPIResponse>
      >(`/info/${this.currentAddress}`)
    ).data.payload;

    return MoverAPISavingsPlusService.mapInfo(data);
  }

  public async getDepositTransactionData(
    inputAmountInUSDCWei: string
  ): Promise<DepositTransactionData> {
    const chainId = getNetwork(this.network)?.chainId;
    if (chainId === undefined) {
      throw new MoverError(`Failed to get chainId of network ${this.network}`);
    }

    const data = (
      await this.client.post<
        MoverAPISuccessfulResponse<DepositTransactionData>
      >('/depositTx', {
        from: chainId,
        amount: inputAmountInUSDCWei,
        address: this.currentAddress
      })
    ).data.payload;

    if (
      ![DepositExecution.Direct, DepositExecution.Bridged].includes(
        data.execution
      )
    ) {
      throw new MoverError(
        'Received invalid deposit transaction data. Validation failed',
        {
          data
        }
      );
    }

    return data;
  }

  public async getWithdrawTransactionData(
    withdrawToNetwork: Network,
    outputAmountInUSDCWei: string
  ): Promise<WithdrawTransactionData> {
    const chainId = getNetwork(withdrawToNetwork)?.chainId;
    if (chainId === undefined) {
      throw new MoverError(
        `Failed to get chainId of network ${withdrawToNetwork}`
      );
    }

    let data;
    try {
      data = (
        await this.client.post<
          MoverAPISuccessfulResponse<WithdrawTransactionData>
        >('/withdrawTx', {
          to: chainId,
          amount: outputAmountInUSDCWei,
          address: this.currentAddress
        })
      ).data.payload;
    } catch (error) {
      if (!(error instanceof MoverAPIError)) {
        throw error;
      }

      // re-wrap the error to be distinctive
      // and allow UI to handle the error as needed
      if (error.shortMessage === WithdrawAPIErrorCode.UnsupportedChain) {
        throw new InvalidNetworkForOperationError(
          this.network,
          Network.polygon
        );
      }

      throw error;
    }

    if (
      ![WithdrawExecution.Direct, WithdrawExecution.Backend].includes(
        data.execution
      )
    ) {
      throw new MoverError(
        'Received invalid withdraw transaction data. Validation failed',
        {
          data
        }
      );
    }

    return data;
  }

  protected static mapInfo(data: SavingsPlusInfoAPIResponse): SavingsPlusInfo {
    return {
      actionHistory: MoverAPISavingsPlusService.isFieldsReducerEnabled
        ? undefined
        : data.actionHistory.map((item): SavingsPlusActionHistoryItem => {
            return {
              amount: item.amount,
              block: item.block,
              timestamp: item.timestamp,
              txId: item.txId,
              type: item.type
            };
          }),
      avg30DaysAPY: data.avg30DaysAPY,
      currentBalance: data.currentBalance,
      currentPoolBalance: data.currentPoolBalance,
      earnedThisMonth: data.earnedThisMonth,
      earnedTotal: data.earnedTotal,
      last12MonthsBalances: data.last12MonthsBalances.map(
        (item): SavingsPlusMonthBalanceItem => {
          return {
            balance: item.balance,
            earned: item.earned,
            month: item.month,
            snapshotTimestamp: item.snapshotTimestamp,
            type: 'savings_plus_month_balance_item',
            year: item.year
          };
        }
      )
    };
  }

  protected lookupBaseURL(): string {
    return 'https://api.viamover.com/api/v1/savingsplus';
  }
}
