import dayjs from 'dayjs';
import { ChartData, ChartType } from 'chart.js';

import {
  SavingsHourlyBalancesItem,
  SavingsMonthBalanceItem,
  TreasuryHourlyBalancesItem,
  TreasuryMonthBonusesItem
} from '@/services/mover';
import { fromWei } from '@/utils/bigmath';
import { dateFromExplicitPair } from '@/utils/time';

type FilterPeriod = 'month' | 'week' | 'day';
type TItem =
  | TreasuryHourlyBalancesItem
  | SavingsHourlyBalancesItem
  | TreasuryMonthBonusesItem
  | SavingsMonthBalanceItem;
const filterByPeriod = (
  list: Array<TItem>,
  period: FilterPeriod
): Array<TItem> => {
  if (period === 'month' || list.length === 0) {
    return list;
  }

  const rightBound = dayjs.unix(list[0].snapshotTimestamp).endOf('month');
  return list
    .slice()
    .filter(
      (value) =>
        rightBound.diff(dayjs.unix(value.snapshotTimestamp), period) < 1
    );
};

const DECIMATION_PERIOD = 12;

export const buildBalancesChartData = (
  list: Array<TItem>,
  chartType: ChartType,
  filterPeriod: FilterPeriod
): ChartData<'line' | 'bar', Array<number>, string> => {
  return filterByPeriod(list, filterPeriod).reduce(
    (acc, val) => {
      let valSource: number;
      switch (val.type) {
        case 'savings_hourly_balance_item':
          valSource = val.balance;
          break;
        case 'savings_month_balance_item':
          valSource = val.balance;
          break;
        case 'treasury_hourly_balance_item':
          valSource = val.bonusEarned;
          break;
        case 'treasury_month_bonuses_item':
          valSource = val.bonusesEarned;
          break;
      }

      if (valSource === 0) {
        return acc;
      }

      if (
        'hour' in val &&
        val.hour % DECIMATION_PERIOD !== 0 &&
        ['month', 'week'].includes(filterPeriod)
      ) {
        return acc;
      }

      return {
        labels: acc.labels.concat(
          chartType === 'bar'
            ? dateFromExplicitPair(val.year, val.month).format('MMM, YY')
            : dayjs.unix(val.snapshotTimestamp).toISOString()
        ),
        datasets: [
          {
            data: acc.datasets[0].data.concat(
              Number.parseFloat(fromWei(valSource, 6))
            )
          }
        ]
      };
    },
    {
      labels: new Array<string>(),
      datasets: [
        {
          data: new Array<number>()
        }
      ]
    }
  );
};
