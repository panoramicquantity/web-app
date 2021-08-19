import { divide, multiply, add, isNaN, isFinite } from '@/utils/bigmath';
export const calcTreasuryBoost = (
  treasuryBalanceMove: string,
  treasuryBalanceLP: string,
  walletBalanceMove: string,
  walletBalanceLP: string
): string => {
  const tokenWeight = '1';
  const lpWeight = '2.5';

  let boostMove = multiply(
    divide(treasuryBalanceMove, add(walletBalanceMove, treasuryBalanceMove)),
    tokenWeight
  );

  if (isNaN(boostMove) || !isFinite(boostMove)) {
    boostMove = '0';
  }

  let boostLP = multiply(
    divide(treasuryBalanceLP, add(walletBalanceLP, treasuryBalanceLP)),
    lpWeight
  );

  if (isNaN(boostLP) || !isFinite(boostLP)) {
    boostLP = '0';
  }

  let boost = add(boostMove, boostLP);
  if (isNaN(+boost)) {
    boost = '0';
  }

  return boost;
};