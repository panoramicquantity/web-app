import Web3 from 'web3';
import { TransactionReceipt } from 'web3-eth';
import { ContractSendMethod } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { currentBalance } from '@/services/chain/erc20/balance';
import { OnChainServiceError } from '@/services/v2/on-chain';
import { EstimateResponse } from '@/services/v2/on-chain/mover';
import { WrappedToken } from '@/services/v2/on-chain/wrapped-tokens/WrappedToken';
import { addSentryBreadcrumb } from '@/services/v2/utils/sentry';
import { sameAddress } from '@/utils/address';
import { floorDivide, multiply, sub, toWei } from '@/utils/bigmath';
import { Network } from '@/utils/networkTypes';
import { YEARN_SIMPLE_VAULT_ABI } from '@/wallet/references/data';
import {
  getSimpleYearnVaultTokenByAddress,
  YearnVaultData
} from '@/wallet/references/yearnVaultsData';
import { SmallToken, SmallTokenInfo, TransactionsParams } from '@/wallet/types';

export class WrappedTokenYearn extends WrappedToken {
  readonly sentryCategoryPrefix: string;
  private readonly vault: YearnVaultData;

  constructor(wrappedAssetAddress: string, network: Network) {
    super(network);
    const vault = getSimpleYearnVaultTokenByAddress(
      wrappedAssetAddress,
      network
    );
    if (vault === undefined) {
      throw new Error(
        `Can't find simple yearn vault by address: ${wrappedAssetAddress}`
      );
    }
    this.vault = vault;
    this.sentryCategoryPrefix = `wrapped-token.simple-yearn.${this.vault.vaultToken.symbol}`;
  }

  getUnwrappedToken = (): SmallTokenInfo => this.vault.commonToken;

  canHandle(assetAddress: string, network: Network): boolean {
    return (
      network === this.network &&
      sameAddress(this.vault.vaultToken.address, assetAddress)
    );
  }

  async estimateUnwrap(
    inputAsset: SmallTokenInfo,
    inputAmount: string,
    web3: Web3,
    accountAddress: string
  ): Promise<EstimateResponse> {
    const contractABI = YEARN_SIMPLE_VAULT_ABI;

    try {
      const simpleYearnVaultContract = new web3.eth.Contract(
        contractABI as AbiItem[],
        this.vault.vaultToken.address
      );

      const transactionParams = {
        from: accountAddress
      } as TransactionsParams;

      const inputAmountInWEI = toWei(inputAmount, inputAsset.decimals);

      addSentryBreadcrumb({
        type: 'info',
        category: `${this.sentryCategoryPrefix}.estimate-unwrap`,
        message: 'input amount in WEI',
        data: {
          inputAmountInWEI,
          vaultName: this.vault.name,
          vaultAddress: this.vault.vaultToken.address,
          vaultCommonToken: this.vault.commonToken.address
        }
      });

      addSentryBreadcrumb({
        type: 'info',
        category: `${this.sentryCategoryPrefix}.estimate-unwrap`,
        message: 'transaction params',
        data: {
          ...transactionParams
        }
      });

      const gasLimitObj = await (
        simpleYearnVaultContract.methods.withdraw(
          inputAmountInWEI
        ) as ContractSendMethod
      ).estimateGas(transactionParams);

      if (gasLimitObj) {
        const gasLimit = gasLimitObj.toString();
        const gasLimitWithBuffer = floorDivide(
          multiply(gasLimit, '120'),
          '100'
        );

        addSentryBreadcrumb({
          type: 'info',
          category: `${this.sentryCategoryPrefix}.estimate-unwrap`,
          message: 'gas estimations',
          data: {
            gasLimit,
            gasLimitWithBuffer
          }
        });

        return { error: false, gasLimit: gasLimitWithBuffer };
      }
    } catch (error) {
      addSentryBreadcrumb({
        type: 'error',
        category: `${this.sentryCategoryPrefix}.estimate-unwrap`,
        message: 'failed to estimate top up',
        data: {
          error
        }
      });

      throw new OnChainServiceError(
        'Failed to estimate simple yearn vault unwrap'
      ).wrap(error);
    }

    throw new OnChainServiceError(
      'Failed to estimate simple yearn vault unwrap: empty gas limit'
    );
  }

  async unwrap(
    inputAsset: SmallToken,
    inputAmount: string,
    web3: Web3,
    accountAddress: string,
    changeStepToProcess: () => Promise<void>,
    gasLimit: string
  ): Promise<string> {
    const balanceBeforeUnwrap = await currentBalance(
      web3,
      accountAddress,
      this.vault.commonToken.address
    );

    await this._unwrap(
      inputAsset,
      inputAmount,
      web3,
      accountAddress,
      changeStepToProcess,
      gasLimit
    );

    const balanceAfterUnwrap = await currentBalance(
      web3,
      accountAddress,
      this.vault.commonToken.address
    );

    return sub(balanceAfterUnwrap, balanceBeforeUnwrap);
  }

  private async _unwrap(
    inputAsset: SmallToken,
    inputAmount: string,
    web3: Web3,
    accountAddress: string,
    changeStepToProcess: () => Promise<void>,
    gasLimit: string
  ): Promise<TransactionReceipt> {
    const contractABI = YEARN_SIMPLE_VAULT_ABI;

    const contract = new web3.eth.Contract(
      contractABI as AbiItem[],
      this.vault.vaultToken.address
    );

    const transactionParams = {
      from: accountAddress,
      gas: web3.utils.toBN(gasLimit).toNumber(),
      gasPrice: undefined,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null
    } as TransactionsParams;

    const inputAmountInWEI = toWei(inputAmount, inputAsset.decimals);

    addSentryBreadcrumb({
      type: 'info',
      category: `${this.sentryCategoryPrefix}.execute-unwrap`,
      message: 'input amount in WEI',
      data: {
        inputAmountInWEI,
        vaultName: this.vault.name,
        vaultAddress: this.vault.vaultToken.address,
        vaultCommonToken: this.vault.commonToken.address
      }
    });

    addSentryBreadcrumb({
      type: 'info',
      category: `${this.sentryCategoryPrefix}.estimate-unwrap`,
      message: 'transaction params',
      data: {
        ...transactionParams
      }
    });

    addSentryBreadcrumb({
      type: 'info',
      category: `${this.sentryCategoryPrefix}.estimate-unwrap`,
      message: 'currency'
    });

    return new Promise<TransactionReceipt>((resolve, reject) => {
      this.wrapWithSendMethodCallbacks(
        (
          contract.methods.withdraw(inputAmountInWEI) as ContractSendMethod
        ).send(transactionParams),
        resolve,
        reject,
        changeStepToProcess
      );

      return;
    });
  }
}