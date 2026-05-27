import './style.css';
import { DatePicker } from '@capgo/capacitor-date-picker';

const output = document.getElementById('plugin-output');
const dateButton = document.getElementById('pick-date');
const timeButton = document.getElementById('pick-time');
const rangeButton = document.getElementById('pick-range');
const hideButton = document.getElementById('hide-picker');
const versionButton = document.getElementById('get-version');

const setOutput = (value) => {
  output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

const run = async (action) => {
  try {
    setOutput(await action());
  } catch (error) {
    setOutput(`Error: ${error?.message ?? error}`);
  }
};

dateButton.addEventListener('click', () =>
  run(() =>
    DatePicker.present({
      mode: 'date',
      date: '2026-05-27',
      min: '2026-01-01',
      max: '2026-12-31',
      format: 'yyyy-MM-dd',
      title: 'Select date',
    }),
  ),
);

timeButton.addEventListener('click', () =>
  run(() =>
    DatePicker.present({
      mode: 'time',
      format: 'HH:mm',
      is24h: true,
      minuteStep: 15,
      title: 'Select time',
    }),
  ),
);

rangeButton.addEventListener('click', () =>
  run(() =>
    DatePicker.presentRange({
      start: '2026-05-01',
      end: '2026-05-27',
      format: 'yyyy-MM-dd',
      startTitle: 'Start date',
      endTitle: 'End date',
    }),
  ),
);

hideButton.addEventListener('click', () => run(() => DatePicker.hide()));
versionButton.addEventListener('click', () => run(() => DatePicker.getPluginVersion()));
