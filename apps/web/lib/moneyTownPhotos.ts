import type { MoneyId } from './moneyTownLesson';

export interface MoneyPhoto {
  front: string;
  back: string;
  width: number;
  height: number;
  source: string;
}

const photo = (
  id: MoneyId,
  width: number,
  height: number,
  source: string,
): MoneyPhoto => ({
  front: `/images/money-town/${id}-front.webp`,
  back: `/images/money-town/${id}-back.webp`,
  width,
  height,
  source,
});
const coinsSource = 'https://www.rbi.org.in/Scripts/restrospectcoins.aspx';
const notesSource = 'https://www.rbi.org.in/Scripts/pm_republicindia.aspx';

/** RBI reference photographs: coins show their value side first; notes retain specimen markings. */
export const MONEY_PHOTOS: Record<MoneyId, MoneyPhoto> = {
  'coin-rs-1': photo('coin-rs-1', 126, 124, coinsSource),
  'coin-rs-2': photo('coin-rs-2', 154, 155, coinsSource),
  'coin-rs-5': photo('coin-rs-5', 133, 133, coinsSource),
  'coin-rs-10': photo('coin-rs-10', 145, 147, coinsSource),
  'note-rs-10': photo(
    'note-rs-10',
    960,
    439,
    'https://rbi.org.in/cw/rupees-ten.aspx',
  ),
  'note-rs-20': photo(
    'note-rs-20',
    960,
    437,
    'https://rbi.org.in/cw/rupees-twenty.aspx',
  ),
  'note-rs-50': photo(
    'note-rs-50',
    960,
    447,
    'https://rbi.org.in/cw/rupees-fifty.aspx',
  ),
  'note-rs-100': photo(
    'note-rs-100',
    960,
    437,
    'https://rbi.org.in/cw/rupees-one-hundred.aspx',
  ),
  'note-rs-200': photo(
    'note-rs-200',
    960,
    439,
    'https://rbi.org.in/cw/rupees-two-hundred.aspx',
  ),
  'note-rs-500': photo('note-rs-500', 338, 150, notesSource),
};
