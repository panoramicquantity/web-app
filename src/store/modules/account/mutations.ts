import { getNetworkByChainId } from '@/utils/networkTypes';
import { MutationTree } from 'vuex';
import {
  AccountStoreState,
  AccountData,
  Transaction,
  Token,
  TokenWithBalance
} from './types';

export default {
  setCurrentWallet(state, address): void {
    state.currentAddress = address;
  },
  setWalletTokens(state, tokens: Array<TokenWithBalance>): void {
    state.tokens = tokens;
  },
  setAllTokens(state, tokens: Array<Token>): void {
    state.allTokens = tokens;
  },
  setWalletTransactions(state, transactions: Array<Transaction>): void {
    state.transactions = transactions;
  },
  updateWalletTransactions(state, newTransactions: Array<Transaction>): void {
    const filteredExistedTransactions = state.transactions.filter(
      (t: Transaction) => {
        return (
          newTransactions.findIndex((nt: Transaction) => nt.hash === t.hash) !==
          -1
        );
      }
    );
    state.transactions = [...filteredExistedTransactions, ...newTransactions];
  },
  setRefreshEror(state, error): void {
    state.refreshError = error;
  },
  setProviderBeforeCloseCb(state, cb): void {
    state.providerBeforeClose = cb;
  },
  setAccountData(state, ad: AccountData): void {
    state.addresses = ad.addresses;
    if (ad.addresses) {
      state.currentAddress = ad.addresses[0];
    }
    state.balance = ad.balance;
    state.web3 = ad.web3Inst;
    if (ad.networkId !== undefined) {
      state.networkInfo = getNetworkByChainId(ad.networkId);
    } else {
      state.networkInfo = undefined;
    }
  }
} as MutationTree<AccountStoreState>;
