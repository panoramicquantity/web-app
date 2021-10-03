import { GetterTree } from 'vuex';

import { RootStoreState } from '@/store/types';

import { sameAddress } from '@/utils/address';
import { Choice, ProposalInfo } from '@/services/mover/governance';

import {
  ProposalState,
  ProposalStoreState,
  ProposalCumulativeInfo
} from './types';

export default {
  proposalsOrderedByEndingDesc(state): Array<ProposalInfo> {
    return state.items.slice().sort((a, b) => b.proposal.end - a.proposal.end);
  },
  lastProposal(state, getters): ProposalInfo | undefined {
    return getters.proposalsOrderedByEndingDesc[0] ?? undefined;
  },
  timesVoted(state, getters, rootState): number {
    if (rootState.account?.currentAddress === undefined) {
      return 0;
    }

    return state.items.reduce((count, proposal) => {
      if (
        proposal.votes.some((vote) =>
          sameAddress(vote.voter, rootState.account?.currentAddress)
        )
      ) {
        return count + 1;
      }

      return count;
    }, 0);
  },
  proposalsCreated(state, getters, rootState): number {
    if (rootState.account?.currentAddress === undefined) {
      return 0;
    }

    return state.items.reduce((count, proposal) => {
      if (
        sameAddress(proposal.proposal.author, rootState.account?.currentAddress)
      ) {
        return count + 1;
      }

      return count;
    }, 0);
  },
  totalNumberOfProposals(state): number {
    return state.items.length;
  },
  openProposals(state): number {
    return state.items.reduce((count, proposal) => {
      if (proposal.proposal.state === 'active') {
        return count + 1;
      }

      return count;
    }, 0);
  },
  succeededProposals(state, getters): number {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;
    return state.items.reduce((count, proposal) => {
      const proposalStats = source[proposal.proposal.id];

      if (proposal.proposal.state === 'closed' && proposalStats.isSucceded) {
        return count + 1;
      }

      return count;
    }, 0);
  },
  defeatedProposals(state, getters): number {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;
    return state.items.reduce((count, proposal) => {
      const proposalStats = source[proposal.proposal.id];

      if (proposal.proposal.state === 'closed' && !proposalStats.isSucceded) {
        return count + 1;
      }

      return count;
    }, 0);
  },
  proposalCumulativeInfo(state, getters, rootState): ProposalCumulativeInfo {
    return state.items.reduce((acc, item) => {
      let votesCountFor = 0;
      let votesCountAgainst = 0;

      item.scores.all.forEach((score) => {
        item.votes.forEach((vote) => {
          if (vote.choice === Choice.For) {
            votesCountFor = votesCountFor + (score[vote.voter] ?? 0);
          }

          if (vote.choice === Choice.Against) {
            votesCountAgainst = votesCountAgainst + (score[vote.voter] ?? 0);
          }
        });
      });

      const votingPowerSelf = item.scores.self.reduce((acc, score) => {
        return (
          acc +
          (score[rootState.account?.currentAddress ?? 'missing_address'] ?? 0)
        );
      }, 0);

      const votingActivity =
        (100 * (votesCountFor + votesCountAgainst)) / item.communityVotingPower;
      const isQuorumReached =
        votesCountFor + votesCountAgainst >
        item.communityVotingPower * state.minimumVotingThresholdMultiplier;
      const hasOutweight = votesCountFor > votesCountAgainst;
      const isVoted = item.scores.all.some(
        (score) =>
          ![0, undefined].includes(
            score[rootState.account?.currentAddress ?? 'missing_address']
          )
      );
      const hasEnoughVotingPowerToVote =
        isVoted || votingPowerSelf > state.powerNeededToBecomeAProposer;

      return {
        ...acc,
        [item.proposal.id]: {
          state: item.proposal.state,
          communityVotingPower: item.communityVotingPower,
          votesCountFor,
          votesCountAgainst,
          votingActivity,
          isQuorumReached,
          isSucceeded: isQuorumReached && hasOutweight,
          isVoted,
          hasEnoughVotingPowerToVote
        }
      };
    }, {});
  },
  proposalVotedFor(state, getters): (id: string) => number {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;

    return (id: string) => source[id]?.votesCountFor ?? 0;
  },
  proposalVotedAgainst(state, getters): (id: string) => number {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;

    return (id: string) => source[id]?.votesCountAgainst ?? 0;
  },
  proposalCommunityVotingPower(state, getters): (id: string) => number {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;

    return (id: string) => source[id]?.communityVotingPower ?? 0;
  },
  proposalVotingActivity(state, getters): (id: string) => number {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;

    return (id: string) => source[id]?.votingActivity ?? 0;
  },
  proposalState(state, getters): (id: string) => ProposalState {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;

    return (id: string) => {
      const item = source[id];
      if (item === undefined) {
        return 'quorumNotReached';
      }

      if (item.state === 'closed') {
        if (item.isSucceded) {
          return 'accepted';
        } else {
          return 'defeated';
        }
      }

      if (item.isQuorumReached) {
        return 'quorumReached';
      }

      return 'quorumNotReached';
    };
  },
  minimumVotingThreshold(state): number {
    return state.communityVotingPower * state.minimumVotingThresholdMultiplier;
  },
  isAlreadyVoted(state, getters): (id: string) => boolean {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;

    return (id: string) => source[id]?.isVoted ?? false;
  },
  hasEnoughVotingPowerToVote(state, getters): (id: string) => boolean {
    const source: ProposalCumulativeInfo = getters.proposalCumulativeInfo;

    return (id: string) => source[id]?.hasEnoughVotingPowerToVote ?? false;
  },
  hasEnoughVotingPowerToBecomeAProposer(state): boolean {
    return state.votingPowerSelf >= state.powerNeededToBecomeAProposer;
  }
} as GetterTree<ProposalStoreState, RootStoreState>;
