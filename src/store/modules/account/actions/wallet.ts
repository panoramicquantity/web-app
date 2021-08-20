import {
  initOffchainExplorer,
  clearOffchainExplorer
} from '@/wallet/offchainExplorer';
import { InitExplorer } from '@/services/zerion/explorer';
import { ActionTree } from 'vuex';
import { RootStoreState } from '@/store/types';
import {
  AccountStoreState,
  AccountData,
  ProviderNames,
  ProviderData,
  Avatar
} from './../types';
import { Network } from '@/utils/networkTypes';
import { provider } from 'web3-core';
import Web3 from 'web3';
import { TokenWithBalance, Transaction } from '@/wallet/types';
import { getTestnetAssets } from '@/wallet/references/testnetAssets';
import { getWalletTokens } from '@/services/balancer';
import { getAllTokens } from '@/wallet/allTokens';
import { getEthPrice } from '@/services/etherscan/ethPrice';
import {
  getMOVEPriceInWETH,
  getSLPPriceInWETH,
  getUSDCPriceInWETH
} from '@/services/chain';
import {
  clearLastProviderPersist,
  getAvatarFromPersist,
  setAvatarToPersist,
  setLastProviderToPersist
} from '@/settings';
import sample from 'lodash-es/sample';
import {
  bootIntercomSession,
  disconnectIntercomSession
} from '@/router/intercom-utils';

export type RefreshWalletPayload = {
  injected: boolean;
  init: boolean;
};

export type InitWalletPayload = {
  provider: provider;
  providerName: ProviderNames;
  providerBeforeCloseCb: () => void;
  injected: boolean;
};

export default {
  async setCurrentWallet({ commit }, address: string): Promise<void> {
    commit('setCurrentWallet', address);
  },
  setDetectedProvider({ commit }, provider: unknown): void {
    commit('setDetectedProvider', provider);
  },
  setIsDetecting({ commit }, isDetecting: boolean): void {
    commit('setIsDetecting', isDetecting);
  },
  async loadAvatar({ commit, state }): Promise<void> {
    if (state.currentAddress === undefined) {
      commit('setAvatar', sample<Avatar>(state.avatars));
      return;
    }

    const persistedValue = await getAvatarFromPersist(state.currentAddress);
    if (persistedValue !== undefined) {
      commit('setAvatar', persistedValue);
      return;
    }

    const newAvatar = sample<Avatar>(state.avatars);
    if (newAvatar === undefined) {
      return;
    }

    commit('setAvatar', newAvatar);
    await setAvatarToPersist(state.currentAddress, newAvatar);
  },
  async toggleAvatar({ commit, state }): Promise<void> {
    const prevIdx =
      state.avatars.findIndex((av) => av.symbol === state.avatar?.symbol) ?? -1;

    const newAvatar = state.avatars[(prevIdx + 1) % state.avatars.length];
    if (newAvatar === undefined) {
      return;
    }

    commit('setAvatar', newAvatar);
    if (state.currentAddress === undefined) {
      return;
    }

    await setAvatarToPersist(state.currentAddress, newAvatar);
  },

  async initWallet(
    { commit, dispatch },
    payload: InitWalletPayload
  ): Promise<void> {
    try {
      const web3Inst = new Web3(payload.provider);
      (web3Inst.eth as any).maxListenersWarningThreshold = 200;
      commit('setProvider', {
        providerBeforeClose: payload.providerBeforeCloseCb,
        providerName: payload.providerName,
        web3: web3Inst,
        pureProvider: payload.provider
      } as ProviderData);

      dispatch('refreshWallet', {
        injected: payload.injected,
        init: true
      } as RefreshWalletPayload);

      setLastProviderToPersist(payload.providerName);
    } catch (err) {
      console.log("can't init the wallet");
      console.log(err);
    }
  },

  async refreshWallet(
    { dispatch, commit, state },
    payload: RefreshWalletPayload
  ): Promise<void> {
    if (state.provider === undefined) {
      console.info("can't refresh wallet due to empty provider");
      return;
    }

    console.info('getting accounts...');
    let accounts;
    if (payload.injected) {
      accounts = await state.provider.web3.eth.requestAccounts();
    } else {
      accounts = await state.provider.web3.eth.getAccounts();
    }
    console.info('accounts: ', accounts);

    let balance = '';
    if (accounts) {
      balance = await state.provider.web3.eth.getBalance(accounts[0]);
    }
    console.info('balance of the current account:', balance);

    const chainId = await state.provider.web3.eth.getChainId();

    commit('setAccountData', {
      addresses: accounts,
      balance: balance,
      networkId: chainId
    } as AccountData);
    dispatch('loadAvatar');

    if (!state.currentAddress || !state.networkInfo) {
      console.info("can't refresh wallet due to empty address");
      return;
    }
    if (!state.networkInfo) {
      console.info("can't refresh wallet due to empty networkInfo");
      return;
    }

    if (payload.init) {
      bootIntercomSession(state.currentAddress, {
        network: state.networkInfo.network
      });

      console.info('getting all tokens...');
      const allTokens = getAllTokens(state.networkInfo.network);
      commit('setAllTokens', allTokens);
    }

    console.info('Updating wallet tokens from Etherscan...');
    if (state.networkInfo.network === Network.mainnet) {
      if (payload.init) {
        console.log('Starting Offchain Explorer...');
        initOffchainExplorer(state.networkInfo.network);
        console.log('Starting Zerion...');
        const explorer = InitExplorer(
          state.currentAddress,
          'usd',
          state.networkInfo.network,
          (txns: Array<Transaction>) => {
            commit('setWalletTransactions', txns);
          },
          (txns: Array<Transaction>) => {
            commit('updateWalletTransactions', txns);
          },
          (txnsHashes: Array<string>) => {
            commit('removeWalletTransaction', txnsHashes);
          },
          (tokens: Array<TokenWithBalance>) => {
            commit('setWalletTokens', tokens);
          },
          (tokens: Array<TokenWithBalance>) => {
            commit('updateWalletTokens', tokens);
          },
          (tokens: Array<string>) => {
            commit('removeWalletTokens', tokens);
          },
          (chartData: Record<string, [number, number][]>) => {
            commit('setChartData', chartData);
          }
        );
        commit('setExplorer', explorer);
      }

      //
      // console.info('Use ethplorer for mainnet wallet...');
      // const walletRes = await GetWalletInfo(state.currentAddress);
      // if (walletRes.isError || walletRes.result === undefined) {
      // commit(
      //     'setRefreshEror',
      //     `Can't get wallet info from ethplorer: ${walletRes.errorMessage}`
      // );
      // return;
      // }
      // const walletTokens = walletRes.result.tokens.map((et: EthplorerToken) => {
      // return {
      //     address: et.tokenInfo.address,
      //     decimals: parseInt(et.tokenInfo.decimals),
      //     balance: et.rawBalance,
      //     name: et.tokenInfo.name,
      //     priceUSD: et.tokenInfo.price.rate,
      //     symbol: et.tokenInfo.symbol
      // } as TokenWithBalance;
      // });
      // commit('setWalletTokens', walletTokens);
      //
    } else {
      console.info('Not mainnet - should use balancer');
      const tokensList = getTestnetAssets(state.networkInfo.network);
      console.info('tokensList: ', tokensList);
      const tokensWithAmount = await getWalletTokens(
        tokensList,
        state.currentAddress,
        state.provider.web3,
        state.networkInfo.network
      );
      console.info('tokensWithAmount: ', tokensWithAmount);
      commit('setWalletTokens', tokensWithAmount);
    }

    console.info('refresh eth price...');
    // TODO: works only for USD
    const ethPriceInUSDResult = await getEthPrice(state.networkInfo.network);
    if (ethPriceInUSDResult.isError) {
      console.log(
        `can't load eth price: ${JSON.stringify(ethPriceInUSDResult)}`
      );
    } else {
      commit('setEthPrice', ethPriceInUSDResult.result);
    }

    const getMovePriceInWethPromise = getMOVEPriceInWETH(
      state.currentAddress,
      state.networkInfo.network,
      state.provider.web3
    );

    const getUSDCPriceInWETHPromise = getUSDCPriceInWETH(
      state.currentAddress,
      state.networkInfo.network,
      state.provider.web3
    );

    const [moveInWethPrice, usdcInWethPrice] = await Promise.all([
      getMovePriceInWethPromise,
      getUSDCPriceInWETHPromise
    ]);
    commit('setMovePriceInWeth', moveInWethPrice);
    commit('setUsdcPriceInWeth', usdcInWethPrice);

    const slpPriceInWETH = await getSLPPriceInWETH(
      state.movePriceInWeth ?? '0',
      state.currentAddress,
      state.networkInfo.network,
      state.provider.web3
    );

    commit('setSLPPriceInWETH', slpPriceInWETH);

    const savingsFreshData = dispatch('fetchSavingsFreshData');
    const savingsInfoPromise = dispatch('fetchSavingsInfo');

    const treasuryFreshData = dispatch('fetchTreasuryFreshData');
    const treasuryInfoPromise = dispatch('fetchTreasuryInfo');

    await Promise.all([
      savingsInfoPromise,
      treasuryInfoPromise,
      savingsFreshData,
      treasuryFreshData
    ]);

    //const res = await GetTokensPrice([state.allTokens[0].address]);
    //console.log(res);
    //
    // console.info('Updating txns from Etherscan');
    // const txRes = await GetTransactions(
    // state.currentAddress,
    // state.networkInfo.network
    // );
    // if (txRes.isError || txRes.result === undefined) {
    // commit(
    //     'setRefreshEror',
    //     `Can't get transactions from Etherscan: ${txRes.errorMessage}`
    // );
    // return;
    // }
    //
    // commit('updateWalletTransactions', txRes.result);
    //
  },

  async disconnectWallet({ commit, state }): Promise<void> {
    if (state.provider) {
      state.provider.providerBeforeClose();
      if (
        state.provider.pureProvider &&
        state.provider.pureProvider.disconnect
      ) {
        console.log('disconnecting provider...');
        await state.provider.pureProvider.disconnect();
      }
    }
    clearLastProviderPersist();
    clearOffchainExplorer();
    commit('clearWalletData');
    disconnectIntercomSession();
  }
} as ActionTree<AccountStoreState, RootStoreState>;
