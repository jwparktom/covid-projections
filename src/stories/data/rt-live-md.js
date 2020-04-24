const formatDataItem = item => ({
  date: new Date(item.date),
  rt: item.rt,
  rt_l: item.rt - item.rt_c90,
  rt_u: item.rt + item.rt_c90,
});

export const data = [
  { date: '2020-03-05', rt: 1.61, rt_c90: 0.5 },
  { date: '2020-03-12', rt: 1.62, rt_c90: 0.4 },
  { date: '2020-03-19', rt: 1.47, rt_c90: 0.3 },
  { date: '2020-03-26', rt: 1.25, rt_c90: 0.2 },
  { date: '2020-04-02', rt: 1.12, rt_c90: 0.16 },
  { date: '2020-04-09', rt: 0.8, rt_c90: 0.09 },
  { date: '2020-04-16', rt: 1.0, rt_c90: 0.12 },
  { date: '2020-04-23', rt: 1.04, rt_c90: 0.8 },
].map(formatDataItem);
