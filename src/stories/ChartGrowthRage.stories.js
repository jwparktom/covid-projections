import React from 'react';
import GrowthRateChart from '../components/Charts/GrowthRateChart';
import { data } from './data/rt-live-md';

export default {
  title: 'GrowthRateChart',
  component: GrowthRateChart,
};

export const Maryland = () => <GrowthRateChart data={data} />;
