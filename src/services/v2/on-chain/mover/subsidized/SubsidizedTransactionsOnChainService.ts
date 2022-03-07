import Web3 from 'web3';

import { ISmartTreasuryBonusBalanceExecutor } from '@/services/v2/on-chain/mover/ISmartTreasuryBonusBalanceExecutor';
import { SmartTreasuryOnChainService } from '@/services/v2/on-chain/mover/smart-treasury/SmartTreasuryOnChainService';
import { PreparedAction } from '@/services/v2/on-chain/mover/subsidized/types';
import { OnChainService } from '@/services/v2/on-chain/OnChainService';
import {
  fromWei,
  greaterThan,
  greaterThanOrEqual,
  multiply
} from '@/utils/bigmath';
import { Network } from '@/utils/networkTypes';

export class SubsidizedTransactionsOnChainService extends OnChainService {
  protected readonly sentryCategoryPrefix = 'subsidized.on-chain.service';
  protected readonly smartTreasuryBonusBalanceExecutor: ISmartTreasuryBonusBalanceExecutor;

  constructor(
    currentAddress: string,
    network: Network,
    web3Client: Web3,
    smartTreasuryBonusBalanceExecutor?: ISmartTreasuryBonusBalanceExecutor
  ) {
    super(currentAddress, network, web3Client);

    this.smartTreasuryBonusBalanceExecutor =
      smartTreasuryBonusBalanceExecutor ??
      new SmartTreasuryOnChainService(currentAddress, network, web3Client);
  }

  public async isAllowed(
    fastGasPriceGWEI: string,
    txGasLimit: string,
    ethPrice: string
  ): Promise<boolean> {
    const treasuryBonus =
      await this.smartTreasuryBonusBalanceExecutor.getBonusBalance();

    const fastTransactionPriceNative = this.calcFastNativePrice(
      fastGasPriceGWEI,
      txGasLimit,
      ethPrice
    );

    return (
      greaterThanOrEqual(treasuryBonus, fastTransactionPriceNative) &&
      greaterThan(treasuryBonus, '0')
    );
  }

  public calcFastNativePrice(
    fastGasPriceGWEI: string,
    txGasLimit: string,
    ethPrice: string
  ): string {
    return SubsidizedTransactionsOnChainService.calcTransactionFastNativePrice(
      fastGasPriceGWEI,
      txGasLimit,
      ethPrice,
      this.web3Client
    );
  }

  public static calcTransactionFastNativePrice(
    fastGasPriceGWEI: string,
    txGasLimit: string,
    ethPrice: string,
    web3Client: Web3
  ): string {
    const fastGasPriceWEI = web3Client.utils.toWei(fastGasPriceGWEI, 'gwei');
    const fastTransactionPriceWEI = multiply(txGasLimit, fastGasPriceWEI);
    const fastTransactionPriceEth = fromWei(fastTransactionPriceWEI, '18');
    return multiply(fastTransactionPriceEth, ethPrice);
  }

  public async prepareSubsidizedAction(
    actionString: string
  ): Promise<PreparedAction> {
    return {
      actionString,
      signature: await this.signActionString(actionString)
    };
  }

  protected async signActionString(actionString: string): Promise<string> {
    return this.wrapWithSentryLogger(async () => {
      return this.web3Client.eth.personal.sign(
        actionString,
        this.currentAddress,
        ''
      );
    });
  }
}
