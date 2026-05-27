import { registerPlugin } from '@capacitor/core';
const DatePicker = registerPlugin('DatePicker', {
    web: () => import('./web').then((m) => new m.DatePickerWeb()),
});
export * from './definitions';
export { DatePicker };
//# sourceMappingURL=index.js.map