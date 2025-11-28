export interface NoticeScreen {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'alert' | 'fee' | 'exam' | 'general';
}

export const notices: NoticeScreen [] = [
  {
    id: '1',
    title: 'Grand Test Series',
    message: 'Grand test will start from 24 November. Prepare your chapters.',
    date: 'Nov 20, 2025',
    type: 'alert'
  },
  {
    id: '2',
    title: 'Fee Reminder',
    message: 'Monthly fee must be submitted before the 10th of each month.',
    date: 'Nov 10, 2025',
    type: 'fee'
  },
  {
    id: '3',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '4',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '5',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '6',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '7',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '8',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '9',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
  {
    id: '10',
    title: 'Holiday Notice',
    message: 'Institute will remain closed on 25 December (Quaid-e-Azam Day).',
    date: 'Dec 25, 2025',
    type: 'general'
  },
];  
