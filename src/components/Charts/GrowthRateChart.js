import React from 'react';
import Highcharts, { dateFormat } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { GrowthRateChartWrapper } from './GrowthRateChart.style';

// Required for the area-range chart
require('highcharts/highcharts-more')(Highcharts);

const Chart = ({ options }) => (
  <GrowthRateChartWrapper>
    <HighchartsReact highcharts={Highcharts} options={options} />
  </GrowthRateChartWrapper>
);

const COLOR_HIGH = '#FC374D';
const COLOR_MEDIUM = '#FD9026';
const COLOR_LOW = '#3BBCE6';

// The order of the zones is important, not only the values
const RT_ZONES = [
  {
    value: 1.2,
    color: COLOR_LOW,
    className: 'chart-rt__line',
  },
  {
    value: 1.4,
    color: COLOR_MEDIUM,
    className: 'chart-rt__line',
  },
  { color: COLOR_HIGH, className: 'chart-rt__line' },
];

const baseOptions = {
  title: {
    text: undefined,
  },
  subtitle: {
    text: undefined,
  },
  plotOptions: {
    series: {
      animation: false,
      marker: {
        enabled: false,
      },
      states: {
        inactive: {
          opacity: 1,
        },
      },
    },
  },
  legend: {
    enabled: false,
  },
};

const xAxisOptions = {
  type: 'datetime',
  step: 7,
  labels: {
    useHTML: true,
    rotation: 0,
    formatter: function () {
      return dateFormat('%b %e', this.value);
    },
  },
};

const yAxisOptions = {
  title: {
    text: undefined,
  },
  labels: {
    useHTML: true,
    formatter: function () {
      return this.value === 0 ? '' : this.axis.defaultLabelFormatter.call(this);
    },
  },
  gridLineDashStyle: 'Dash',
};

const getDateMs = date => Date.parse(date.toISOString());

const formatRtData = d => ({
  x: getDateMs(d.date),
  y: d.rt,
});

const formatRtRangeData = d => [getDateMs(d.date), d.rt_l, d.rt_u];

const GrowthRateChart = ({ data }) => {
  const serieRt = {
    className: 'chart-rt',
    name: 'Rt',
    type: 'spline',
    data: data.map(formatRtData),
    animation: false,
    marker: {
      enabled: false,
    },
    lineWidth: 4,
    zones: RT_ZONES,
  };

  const serieRtRange = {
    className: 'chart-rt__range',
    type: 'arearange',
    lineWidth: 0,
    lineColor: '#eee',
    fillColor: '#efefef',
    fillOpacity: 0.2,
    zIndex: 0,
    marker: {
      enabled: false,
    },
    data: data.map(formatRtRangeData),
    animation: {
      enabled: false,
    },
    enableMouseTracking: false,
  };

  const options = {
    ...baseOptions,
    xAxis: xAxisOptions,
    yAxis: yAxisOptions,
    series: [serieRtRange, serieRt],
  };
  return (
    <GrowthRateChartWrapper>
      <Chart options={options} />
    </GrowthRateChartWrapper>
  );
};

export default GrowthRateChart;
