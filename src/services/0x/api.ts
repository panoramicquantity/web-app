import { Network } from './../../utils/networkTypes';
import { Result } from './../responses';
import { zeroXResponse, zeroXErrorResponse, isErrorResponse } from './response';
import axios from 'axios';

export type TransferData = {
  data: string;
  allowanceTarget: string;
  to: string;
  value: string;
  buyAmount: string;
  sellAmount: string;
};

export const getTransferData = async (
  buyTokenAddress: string,
  sellTokenAddress: string,
  rawAmount: string,
  isInputAmount = true,
  network = Network.mainnet
): Promise<TransferData> => {
  const amountKey = isInputAmount ? 'sellAmount' : 'buyAmount';
  const prefix = network === Network.mainnet ? '' : `${network.toString()}.`;

  const url = `https://${prefix}api.0x.org/swap/v1/quote?buyToken=${buyTokenAddress}&sellToken=${sellTokenAddress}&${amountKey}=${rawAmount}`;

  console.info(url);

  try {
    const resp = (await axios.get<zeroXResponse | zeroXErrorResponse>(url))
      .data;

    console.info('response:', url);

    if (isErrorResponse(resp)) {
      throw new Error(resp.reason);
    }

    return {
      allowanceTarget: resp.allowanceTarget,
      buyAmount: resp.buyAmount,
      data: resp.data,
      sellAmount: resp.sellAmount,
      to: resp.to,
      value: resp.value
    } as TransferData;
  } catch (err) {
    throw new Error(err);
  }
};
