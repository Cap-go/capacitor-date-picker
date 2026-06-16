# @capgo/capacitor-date-picker

<a href="https://capgo.app/"><img src="https://capgo.app/readme-banner.svg?repo=Cap-go/capacitor-date-picker" alt="Capgo - Instant updates for Capacitor" /></a>

Native date, time, date-time, year-month, and range picker for Capacitor 8 on iOS, Android, and web.

This is Capgo's maintained alternative to `@capacitor-community/date-picker`. The main difference is maintenance speed: we listen to community reports, fix issues fast, and ship updates instead of leaving long-standing GitHub issues open.

## What We Fixed

- Capacitor 8 support.
- Web implementation with the same `present()` API.
- Programmatic `hide()`.
- Dialog title support.
- iOS rotation-safe layout.
- iOS locale handling for inline day/month labels.
- iOS `yearAndMonth` mode.
- No iOS force unwrap crash on invalid dates.
- ISO, Java/Unicode, and common Moment-style formats such as `YYYY-MM-DD`.
- Date-only timezone handling without one-day shifts.
- iOS `min` and `max` parsing with ISO strings.
- Android nested `android` options.
- Android `is24h`.
- Android dateAndTime keeps the chosen date when moving to time.
- Android dialog width/layout handling.
- Android UI-thread dialog handling so native dialogs open reliably from Capacitor calls.
- Minute steps for time pickers.
- Range selection via `presentRange()`.

## Demo

| iOS | Android |
| --- | --- |
| <img src="https://raw.githubusercontent.com/Cap-go/capacitor-date-picker/main/screenshots/demo/ios-date-picker-demo.webp" alt="Animated iOS demo showing the native date picker opening, selecting a date, and closing" width="320" /> | <img src="https://raw.githubusercontent.com/Cap-go/capacitor-date-picker/main/screenshots/demo/android-date-picker-demo.webp" alt="Animated Android demo showing the native date picker opening, selecting a date, and closing" width="320" /> |

## Screenshots

| iOS | Android |
| --- | --- |
| <img src="https://raw.githubusercontent.com/Cap-go/capacitor-date-picker/main/screenshots/ios-date-picker.png" alt="iOS native date picker" width="320" /> | <img src="https://raw.githubusercontent.com/Cap-go/capacitor-date-picker/main/screenshots/android-date-picker.png" alt="Android native date picker" width="320" /> |

## Install

You can use our AI-Assisted Setup to install the plugin. Add the Capgo skills to your AI tool using the following command:

```bash
npx skills add https://github.com/cap-go/capacitor-skills --skill capacitor-plugins
```

Then use the following prompt:

```text
Use the `capacitor-plugins` skill from `cap-go/capacitor-skills` to install the `@capgo/capacitor-date-picker` plugin in my project.
```

If you prefer Manual Setup, install the plugin by running the following commands and follow the platform-specific instructions below:

```bash
npm install @capgo/capacitor-date-picker
npx cap sync
```

## Usage

```ts
import { DatePicker } from '@capgo/capacitor-date-picker';

const result = await DatePicker.present({
  mode: 'date',
  date: '2026-05-27',
  min: '2026-01-01',
  max: '2026-12-31',
  format: 'yyyy-MM-dd',
  title: 'Select a date',
});

console.log(result.value);
```

```ts
const time = await DatePicker.present({
  mode: 'time',
  is24h: true,
  minuteStep: 15,
  format: 'HH:mm',
});
```

```ts
const range = await DatePicker.presentRange({
  start: '2026-05-01',
  end: '2026-05-27',
  format: 'yyyy-MM-dd',
  startTitle: 'Start date',
  endTitle: 'End date',
});

console.log(range.start, range.end);
```

## Platform Notes

- iOS uses `UIDatePicker` with Auto Layout so the picker survives screen rotation.
- Android uses platform `DatePickerDialog` and `TimePickerDialog`; range selection is two native date selections.
- Web uses native browser inputs in a small modal wrapper.
- `minuteStep` is rounded to a platform-supported interval on iOS.

## API

<docgen-index>

* [`present(...)`](#present)
* [`presentRange(...)`](#presentrange)
* [`hide()`](#hide)
* [`getPluginVersion()`](#getpluginversion)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### present(...)

```typescript
present(options?: DatePickerOptions | undefined) => Promise<DatePickerResult>
```

Present the date picker.

| Param         | Type                                                            |
| ------------- | --------------------------------------------------------------- |
| **`options`** | <code><a href="#datepickeroptions">DatePickerOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#datepickerresult">DatePickerResult</a>&gt;</code>

--------------------


### presentRange(...)

```typescript
presentRange(options?: DatePickerRangeOptions | undefined) => Promise<DatePickerRangeResult>
```

Present a range picker. Native platforms use two native date selections;
web shows start and end controls in one dialog.

| Param         | Type                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| **`options`** | <code><a href="#datepickerrangeoptions">DatePickerRangeOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#datepickerrangeresult">DatePickerRangeResult</a>&gt;</code>

--------------------


### hide()

```typescript
hide() => Promise<void>
```

Close the currently visible picker, if any.

--------------------


### getPluginVersion()

```typescript
getPluginVersion() => Promise<PluginVersionResult>
```

Returns the platform implementation version marker.

**Returns:** <code>Promise&lt;<a href="#pluginversionresult">PluginVersionResult</a>&gt;</code>

--------------------


### Interfaces


#### DatePickerResult

| Prop        | Type                        | Description                                           |
| ----------- | --------------------------- | ----------------------------------------------------- |
| **`value`** | <code>string \| null</code> | Formatted value. Null means the picker was dismissed. |


#### DatePickerOptions

| Prop          | Type                                                                          | Description                                                   |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **`min`**     | <code>string</code>                                                           | Minimum selectable value.                                     |
| **`max`**     | <code>string</code>                                                           | Maximum selectable value.                                     |
| **`date`**    | <code>string</code>                                                           | Initial selected value.                                       |
| **`ios`**     | <code><a href="#datepickeriosoptions">DatePickerIosOptions</a></code>         | Platform-specific iOS options override top-level options.     |
| **`android`** | <code><a href="#datepickerandroidoptions">DatePickerAndroidOptions</a></code> | Platform-specific Android options override top-level options. |


#### DatePickerIosOptions

| Prop                    | Type                                                              | Description                                           | Default               |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | --------------------- |
| **`style`**             | <code><a href="#datepickeriosstyle">DatePickerIosStyle</a></code> | iOS picker style.                                     | <code>"inline"</code> |
| **`titleFontColor`**    | <code>string</code>                                               |                                                       |                       |
| **`titleBgColor`**      | <code>string</code>                                               |                                                       |                       |
| **`bgColor`**           | <code>string</code>                                               |                                                       |                       |
| **`fontColor`**         | <code>string</code>                                               |                                                       |                       |
| **`buttonBgColor`**     | <code>string</code>                                               |                                                       |                       |
| **`buttonFontColor`**   | <code>string</code>                                               |                                                       |                       |
| **`mergedDateAndTime`** | <code>boolean</code>                                              | Show date and time in one UIDatePicker when possible. |                       |


#### DatePickerAndroidOptions

| Prop        | Type                                                        | Description                                               |
| ----------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| **`theme`** | <code><a href="#datepickertheme">DatePickerTheme</a></code> | Android dialog theme resource name or built-in theme key. |


#### DatePickerRangeResult

| Prop        | Type                        | Description                                                 |
| ----------- | --------------------------- | ----------------------------------------------------------- |
| **`start`** | <code>string \| null</code> | Formatted start value. Null means the picker was dismissed. |
| **`end`**   | <code>string \| null</code> | Formatted end value. Null means the picker was dismissed.   |
| **`value`** | <code>string \| null</code> | Convenience "start/end" value when both dates are selected. |


#### DatePickerRangeOptions

| Prop             | Type                | Description                               |
| ---------------- | ------------------- | ----------------------------------------- |
| **`start`**      | <code>string</code> | Initial range start value.                |
| **`end`**        | <code>string</code> | Initial range end value.                  |
| **`startTitle`** | <code>string</code> | Title used while choosing the start date. |
| **`endTitle`**   | <code>string</code> | Title used while choosing the end date.   |


#### PluginVersionResult

| Prop          | Type                |
| ------------- | ------------------- |
| **`version`** | <code>string</code> |


### Type Aliases


#### DatePickerIosStyle

<code>'wheels' | 'inline' | 'compact' | 'automatic'</code>


#### DatePickerTheme

<code>'light' | 'dark' | string</code>

</docgen-api>
