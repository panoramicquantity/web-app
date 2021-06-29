import {
  convertStringToHexWithPrefix,
  getPureEthAddress
} from '@/utils/address';
import { BigNumber } from 'bignumber.js';
import { multiply, toWei } from './../../../utils/bigmath';
import { AbiItem } from 'web3-utils';
import { executeTransactionWithApprove } from './../actionWithApprove';
import { Network } from '@/utils/networkTypes';
import { SmallToken, TransactionsParams } from '@/wallet/types';
import { TransferData } from '@/services/0x/api';
import Web3 from 'web3';
import {
  ACTION,
  createSwapActionString,
  sendSubsidizedRequest,
  SubsidizedRequestError
} from '../subsidized';

export const swapSubsidized = async (
  inputAsset: SmallToken,
  outputAsset: SmallToken,
  inputAmount: string,
  transferData: TransferData,
  network: Network,
  web3: Web3,
  accountAddress: string
): Promise<void> => {
  console.log('Executing SUBSUDIZED swap...');

  const expectedMinimumReceived = new BigNumber(
    multiply(transferData.buyAmount, '0.85')
  ).toFixed(0);

  console.log(
    '[holy subsidized swap] expected minimum received:',
    expectedMinimumReceived
  );

  const inputAmountInWEI = toWei(inputAmount, inputAsset.decimals);

  const actionString = createSwapActionString(
    accountAddress,
    inputAsset.address,
    outputAsset.address,
    inputAmountInWEI,
    expectedMinimumReceived
  );

  try {
    const subsidizedResponse = await sendSubsidizedRequest(
      ACTION.SWAP,
      actionString,
      accountAddress,
      network,
      web3
    );
  } catch (err) {
    if (err instanceof SubsidizedRequestError) {
      console.error(`Subsidized request error: ${err.message}`);
    }
  }
};