import { sameAddress } from '@/utils/address';
import { toWei } from '@/utils/bigmath';
import { AbiItem } from 'web3-utils';
import { executeTransactionWithApprove } from '@/wallet/actions/actionWithApprove';
import { Network } from '@/utils/networkTypes';
import { SmallToken, TransactionsParams } from '@/wallet/types';
import Web3 from 'web3';
import {
  getMoveAssetData,
  HOLY_HAND_ABI,
  HOLY_HAND_ADDRESS
} from '@/wallet/references/data';

export const claimAndBurnCompound = async (
  inputAsset: SmallToken,
  inputAmount: string,
  network: Network,
  web3: Web3,
  accountAddress: string,
  actionGasLimit: string,
  approveGasLimit: string,
  gasPriceInGwei: string,
  changeStepToProcess: () => Promise<void>
): Promise<void> => {
  const contractAddress = HOLY_HAND_ADDRESS(network);

  try {
    await executeTransactionWithApprove(
      inputAsset,
      contractAddress,
      inputAmount,
      accountAddress,
      web3,
      approveGasLimit,
      gasPriceInGwei,
      async () => {
        await claimAndBurn(
          inputAsset,
          inputAmount,
          network,
          web3,
          accountAddress,
          actionGasLimit,
          gasPriceInGwei,
          changeStepToProcess
        );
      },
      changeStepToProcess
    );
  } catch (err) {
    console.error(`Can't treasury claim and burn: ${err}`);
    throw err;
  }
};

export const claimAndBurn = async (
  inputAsset: SmallToken,
  inputAmount: string,
  network: Network,
  web3: Web3,
  accountAddress: string,
  gasLimit: string,
  gasPriceInGwei: string,
  changeStepToProcess: () => Promise<void>
): Promise<void> => {
  console.log('Executing treasury claim and burn...');

  if (!sameAddress(inputAsset.address, getMoveAssetData(network).address)) {
    throw 'Only MOVE can be burned';
  }

  const contractAddress = HOLY_HAND_ADDRESS(network);
  const contractABI = HOLY_HAND_ABI;

  try {
    const holyHand = new web3.eth.Contract(
      contractABI as AbiItem[],
      contractAddress
    );

    const transactionParams = {
      from: accountAddress,
      gas: web3.utils.toBN(gasLimit).toNumber(),
      gasPrice: web3.utils
        .toWei(web3.utils.toBN(gasPriceInGwei), 'gwei')
        .toString()
    } as TransactionsParams;

    const inputAmountInWEI = toWei(inputAmount, inputAsset.decimals);

    console.log(
      '[treasury claim and burn] input amount in WEI:',
      inputAmountInWEI
    );
    console.log(
      '[treasury claim and burn] transactionParams:',
      transactionParams
    );

    await new Promise<void>((resolve, reject) => {
      holyHand.methods
        .claimAndBurn(inputAmountInWEI)
        .send(transactionParams)
        .once('transactionHash', (hash: string) => {
          console.log(`Treasury claim and burn txn hash: ${hash}`);
          changeStepToProcess();
        })
        .once('receipt', (receipt: any) => {
          console.log(`Treasury claim and burnt txn receipt: ${receipt}`);
          resolve();
        })
        .once('error', (error: Error) => {
          console.log(`Treasury claim and burn txn error: ${error}`);
          reject(error);
        });
    });
  } catch (error) {
    console.error(`can't execute treasury claim and burn due to: ${error}`);
    throw error;
  }
};