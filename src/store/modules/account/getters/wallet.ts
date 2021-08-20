import { GetterTree } from 'vuex';
import dayjs from 'dayjs';

import { add, fromWei, multiply } from '@/utils/bigmath';

import { AccountStoreState, TransactionGroup } from '../types';
import { RootStoreState } from '@/store/types';
import { Token, TokenWithBalance, Transaction } from '@/wallet/types';
import { getUSDCAssetData } from '@/wallet/references/data';
import { OffchainExplorerHanler } from '@/wallet/offchainExplorer';

export default {
  transactionsGroupedByDay(state): Array<TransactionGroup> {
    const groupsByDay = state.transactions.reduce(
      (
        res: Record<number, TransactionGroup>,
        tx: Transaction
      ): Record<number, TransactionGroup> => {
        const groupKey = dayjs.unix(tx.timestamp).startOf('day').unix();
        if (res[groupKey] !== undefined) {
          const retVal = { ...res[groupKey] };
          retVal.transactions.push(tx);

          return { ...res, [groupKey]: retVal };
        }

        return {
          ...res,
          [groupKey]: { timeStamp: groupKey, transactions: [tx] }
        };
      },
      {}
    );
    return Object.values(groupsByDay).reverse();
  },
  isWalletConnected(state): boolean {
    return state.currentAddress !== undefined;
  },
  isWalletReady(state, getters): boolean {
    return (
      getters.isWalletConnected &&
      state.provider !== undefined &&
      !state.isDetecting &&
      state.savingsInfo !== undefined &&
      state.treasuryInfo !== undefined
    );
  },
  entireBalance(state, getters): string {
    let balance = '0';
    balance = state.tokens.reduce<string>((acc, token) => {
      const tokenPrice = multiply(token.balance, token.priceUSD);
      if (tokenPrice) {
        return add(acc, tokenPrice);
      }
      return acc;
    }, '0');

    if (state.savingsInfo !== undefined && state.networkInfo !== undefined) {
      const savingsBalanceInUSDC = fromWei(
        state.savingsInfo.currentBalance,
        getUSDCAssetData(state.networkInfo.network).decimals
      );
      balance = add(
        balance,
        multiply(savingsBalanceInUSDC, getters.usdcNativePrice)
      );
    }

    return balance;
  },
  ethPrice(state): string {
    return state.ethPrice ?? '0';
  },
  moveNativePrice(state): string {
    if (state.movePriceInWeth === undefined || state.ethPrice === undefined) {
      return '0';
    }
    return multiply(state.movePriceInWeth, state.ethPrice);
  },
  usdcNativePrice(state): string {
    if (state.usdcPriceInWeth === undefined || state.ethPrice === undefined) {
      return '0';
    }
    return multiply(state.usdcPriceInWeth, state.ethPrice);
  },
  slpNativePrice(state): string {
    if (state.slpPriceInWeth === undefined || state.ethPrice === undefined) {
      return '0';
    }
    return multiply(state.slpPriceInWeth, state.ethPrice);
  },
  getTokenColor(state): (address?: string) => string | undefined {
    return (address?: string) => {
      if (state.tokenColorMap === undefined) {
        return '';
      }

      if (address === undefined) {
        return '';
      }

      return state.tokenColorMap[address.toLowerCase()];
    };
  },
  searchInAllTokens(state): (searchTerm: string) => Array<Token> {
    return (searchTerm: string) => {
      const searchTermProcessed = searchTerm.trim().toLowerCase();
      if (searchTermProcessed === '') {
        return state.allTokens.slice(0, 100);
      }

      if (state.allTokensSearcher === undefined) {
        return state.allTokens
          .filter(
            (t) =>
              t.symbol.toLowerCase().includes(searchTermProcessed) ||
              t.name.toLowerCase().includes(searchTermProcessed)
          )
          .slice(0, 100);
      }

      return state.allTokensSearcher
        .search(searchTerm, { limit: 50 })
        .map((res) => res.item);
    };
  },
  searchInWalletTokens(state): (searchTerm: string) => Array<TokenWithBalance> {
    return (searchTerm: string) => {
      const searchTermProcessed = searchTerm.trim().toLowerCase();

      if (searchTermProcessed === '') {
        return state.tokens;
      }

      if (state.tokensSearcher === undefined) {
        return state.tokens.filter(
          (t) =>
            t.symbol.toLowerCase().includes(searchTermProcessed) ||
            t.name.toLowerCase().includes(searchTermProcessed)
        );
      }

      return state.tokensSearcher.search(searchTerm).map((res) => res.item);
    };
  },
  getOffchainExplorerHanlder(state): OffchainExplorerHanler | undefined {
    return state.offchainExplorerHanlder;
  }
} as GetterTree<AccountStoreState, RootStoreState>;
