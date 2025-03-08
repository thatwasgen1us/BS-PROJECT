
interface base {
  name: string,
  month: number,
  year: number
} 


export const bases : base [] = [
  {
    name: 'NS2304',
    month: 99.5,
    year: 98.9
  },
  {
    name: 'NS2305',
    month: 95.3,
    year: 97.2
  },
  {
    name: 'NS2306',
    month: 98.1,
    year: 96.8
  },
  {
    name: 'NS2307',
    month: 97.7,
    year: 95.4
  },
  {
    name: 'NS2308',
    month: 99.0,
    year: 98.1
  },
  {
    name: 'NS2309',
    month: 96.5,
    year: 97.9
  },
  {
    name: 'NS2310',
    month: 98.8,
    year: 96.3
  },
  {
    name: 'NS2311',
    month: 97.2,
    year: 95.7
  },
  {
    name: 'NS2312',
    month: 99.2,
    year: 98.5
  },
  {
    name: 'NS2401',
    month: 96.9,
    year: 97.4
  }
];

interface week {
  CA_2G: string | number;
  change_of_battery: string;
  combined_text: string | null;
  count_of_alarms: string;
  time_of_alarms: string;
  weak: string;
  weak_right: string | null;
}

export const baseStation: week[] = [{
  CA_2G: 98.7,
  change_of_battery: '01:23:23',
  combined_text: 'Какой то текст',
  count_of_alarms: '2',
  time_of_alarms: '01:23:23',
  weak: 'w2501',
  weak_right:'w2501',
}]