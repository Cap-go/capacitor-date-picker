'use strict';

var core = require('@capacitor/core');

const DatePicker = core.registerPlugin('DatePicker', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.DatePickerWeb()),
});

const DEFAULT_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
class DatePickerWeb extends core.WebPlugin {
    async present(options = {}) {
        const normalized = normalizeOptions(options);
        if (normalized.mode === 'range') {
            const range = await this.presentRange(normalized);
            return { value: range.value };
        }
        return new Promise((resolve) => {
            var _a, _b;
            const input = createInput(normalized);
            const overlay = this.createOverlay(normalized.title);
            const actions = createActions(normalized);
            (_a = overlay.querySelector('[data-capgo-picker-body]')) === null || _a === void 0 ? void 0 : _a.append(input);
            (_b = overlay.querySelector('[data-capgo-picker-actions]')) === null || _b === void 0 ? void 0 : _b.append(actions.cancel, actions.done);
            const close = (value) => {
                this.closeActive();
                resolve({ value });
            };
            actions.cancel.addEventListener('click', () => close(null));
            actions.done.addEventListener('click', () => {
                const date = dateFromInput(input.value, normalized.mode);
                close(date === null ? null : formatDate(date, normalized));
            });
            this.openOverlay(overlay, () => close(null));
            focusInput(input);
        });
    }
    async presentRange(options = {}) {
        const normalized = normalizeOptions(Object.assign(Object.assign({}, options), { mode: 'date' }));
        return new Promise((resolve) => {
            var _a, _b, _c, _d;
            const start = createInput(Object.assign(Object.assign({}, normalized), { date: (_a = options.start) !== null && _a !== void 0 ? _a : options.date, title: options.startTitle }));
            const end = createInput(Object.assign(Object.assign({}, normalized), { date: options.end, title: options.endTitle }));
            const overlay = this.createOverlay(normalized.title);
            const actions = createActions(normalized);
            const body = overlay.querySelector('[data-capgo-picker-body]');
            body === null || body === void 0 ? void 0 : body.append(wrapInput((_b = options.startTitle) !== null && _b !== void 0 ? _b : 'Start', start), wrapInput((_c = options.endTitle) !== null && _c !== void 0 ? _c : 'End', end));
            (_d = overlay.querySelector('[data-capgo-picker-actions]')) === null || _d === void 0 ? void 0 : _d.append(actions.cancel, actions.done);
            const close = (result) => {
                this.closeActive();
                resolve(result);
            };
            actions.cancel.addEventListener('click', () => close(emptyRange()));
            actions.done.addEventListener('click', () => {
                const startDate = dateFromInput(start.value, 'date');
                const endDate = dateFromInput(end.value, 'date');
                const startValue = startDate === null ? null : formatDate(startDate, normalized);
                const endValue = endDate === null ? null : formatDate(endDate, normalized);
                close({
                    start: startValue,
                    end: endValue,
                    value: startValue !== null && endValue !== null ? `${startValue}/${endValue}` : null,
                });
            });
            this.openOverlay(overlay, () => close(emptyRange()));
            focusInput(start);
        });
    }
    async hide() {
        this.closeActive();
    }
    async getPluginVersion() {
        return {
            version: 'web',
        };
    }
    createOverlay(title) {
        const overlay = document.createElement('div');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:2147483647',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'background:rgba(0,0,0,.38)',
            'font:16px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        ].join(';');
        const dialog = document.createElement('div');
        dialog.style.cssText = [
            'box-sizing:border-box',
            'width:min(360px,calc(100vw - 32px))',
            'border-radius:8px',
            'background:#fff',
            'color:#111',
            'box-shadow:0 18px 48px rgba(0,0,0,.24)',
            'padding:16px',
        ].join(';');
        if (title !== undefined && title.length > 0) {
            const heading = document.createElement('div');
            heading.textContent = title;
            heading.style.cssText = 'font-weight:600;margin:0 0 12px';
            dialog.append(heading);
        }
        const body = document.createElement('div');
        body.dataset.capgoPickerBody = 'true';
        body.style.cssText = 'display:grid;gap:12px';
        const actions = document.createElement('div');
        actions.dataset.capgoPickerActions = 'true';
        actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:16px';
        dialog.append(body, actions);
        overlay.append(dialog);
        overlay.addEventListener('click', (event) => {
            var _a;
            if (event.target === overlay) {
                (_a = this.activePicker) === null || _a === void 0 ? void 0 : _a.resolveEmpty();
            }
        });
        return overlay;
    }
    openOverlay(overlay, resolveEmpty) {
        this.closeActive();
        this.activePicker = { overlay, resolveEmpty };
        document.body.append(overlay);
    }
    closeActive() {
        var _a;
        (_a = this.activePicker) === null || _a === void 0 ? void 0 : _a.overlay.remove();
        this.activePicker = undefined;
    }
}
function normalizeOptions(options) {
    var _a, _b, _c;
    const platform = options;
    const merged = Object.assign(Object.assign({}, options), { format: (_a = platform.format) !== null && _a !== void 0 ? _a : DEFAULT_FORMAT, mode: (_b = platform.mode) !== null && _b !== void 0 ? _b : 'dateAndTime', minuteStep: sanitizeStep((_c = platform.minuteStep) !== null && _c !== void 0 ? _c : platform.steps) });
    return merged;
}
function createInput(options) {
    const input = document.createElement('input');
    input.type = inputTypeForMode(options.mode);
    input.value = inputValue(options);
    input.min = minMaxValue(options.min, options.mode, options.format);
    input.max = minMaxValue(options.max, options.mode, options.format);
    input.step = stepValue(options);
    input.style.cssText = [
        'box-sizing:border-box',
        'width:100%',
        'font:inherit',
        'padding:10px 12px',
        'border:1px solid #b8bec8',
        'border-radius:6px',
        'background:#fff',
        'color:#111',
    ].join(';');
    return input;
}
function createActions(options) {
    var _a, _b;
    const cancel = createButton((_a = options.cancelText) !== null && _a !== void 0 ? _a : 'Cancel');
    const done = createButton((_b = options.doneText) !== null && _b !== void 0 ? _b : 'OK');
    return { cancel, done };
}
function createButton(label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText = [
        'font:inherit',
        'border:0',
        'border-radius:6px',
        'padding:8px 12px',
        'background:#f1f3f5',
        'color:#111',
    ].join(';');
    return button;
}
function wrapInput(label, input) {
    const wrapper = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = label;
    text.style.cssText = 'display:block;font-size:13px;margin-bottom:4px;color:#424852';
    wrapper.append(text, input);
    return wrapper;
}
function focusInput(input) {
    requestAnimationFrame(() => {
        var _a;
        input.focus();
        (_a = input.showPicker) === null || _a === void 0 ? void 0 : _a.call(input);
    });
}
function inputTypeForMode(mode) {
    if (mode === 'time' || mode === 'countDownTimer') {
        return 'time';
    }
    if (mode === 'yearAndMonth') {
        return 'month';
    }
    if (mode === 'date') {
        return 'date';
    }
    return 'datetime-local';
}
function inputValue(options) {
    var _a;
    const date = (_a = parseDate(options.date, options.format, options.mode)) !== null && _a !== void 0 ? _a : new Date();
    const parts = partsFromDate(date, options.timezone);
    if (options.mode === 'time' || options.mode === 'countDownTimer') {
        return `${pad(parts.hour)}:${pad(parts.minute)}`;
    }
    if (options.mode === 'yearAndMonth') {
        return `${parts.year}-${pad(parts.month)}`;
    }
    if (options.mode === 'date') {
        return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    }
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}
function minMaxValue(value, mode, format) {
    if (value === undefined) {
        return '';
    }
    return inputValue({ date: value, mode, format });
}
function stepValue(options) {
    var _a;
    const minuteStep = sanitizeStep((_a = options.minuteStep) !== null && _a !== void 0 ? _a : options.steps);
    if (minuteStep > 1) {
        return String(minuteStep * 60);
    }
    return '60';
}
function dateFromInput(value, mode) {
    if (value.length === 0) {
        return null;
    }
    if (mode === 'time' || mode === 'countDownTimer') {
        const [hour = '0', minute = '0', second = '0'] = value.split(':');
        const date = new Date();
        date.setHours(Number(hour), Number(minute), Number(second), 0);
        return date;
    }
    if (mode === 'yearAndMonth') {
        const [year, month] = value.split('-').map(Number);
        return new Date(year, month - 1, 1, 12, 0, 0, 0);
    }
    if (mode === 'date') {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
    return new Date(value);
}
function parseDate(value, format, mode) {
    if (value === undefined || value.length === 0) {
        return null;
    }
    const native = new Date(value);
    if (!Number.isNaN(native.getTime()) && !isDateOnly(value, mode)) {
        return native;
    }
    const fromFormat = parseByFormat(value, format);
    if (fromFormat !== null) {
        return fromFormat;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
    return Number.isNaN(native.getTime()) ? null : native;
}
function parseByFormat(value, format) {
    const normalized = normalizeFormat(format);
    const tokens = ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss', 'SSS'];
    let pattern = '^';
    const groups = [];
    for (let index = 0; index < normalized.length;) {
        const token = tokens.find((candidate) => normalized.startsWith(candidate, index));
        if (token !== undefined) {
            pattern += token === 'SSS' ? '(\\d{1,3})' : '(\\d{1,4})';
            groups.push(token);
            index += token.length;
        }
        else {
            pattern += escapeRegExp(normalized[index]);
            index += 1;
        }
    }
    const match = new RegExp(`${pattern}$`).exec(value);
    if (match === null) {
        return null;
    }
    const parts = { year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 };
    groups.forEach((group, index) => {
        const parsed = Number(match[index + 1]);
        if (group === 'yyyy')
            parts.year = parsed;
        if (group === 'MM')
            parts.month = parsed;
        if (group === 'dd')
            parts.day = parsed;
        if (group === 'HH')
            parts.hour = parsed;
        if (group === 'mm')
            parts.minute = parsed;
        if (group === 'ss')
            parts.second = parsed;
        if (group === 'SSS')
            parts.millisecond = parsed;
    });
    return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
}
function formatDate(date, options) {
    const parts = partsFromDate(date, options.timezone);
    const replacements = {
        yyyy: String(parts.year),
        MM: pad(parts.month),
        dd: pad(parts.day),
        HH: pad(parts.hour),
        mm: pad(parts.minute),
        ss: pad(parts.second),
        SSS: pad(parts.millisecond, 3),
    };
    return normalizeFormat(options.format).replace(/yyyy|MM|dd|HH|mm|ss|SSS/g, (token) => replacements[token]);
}
function partsFromDate(date, timezone) {
    if (timezone !== undefined && timezone.length > 0) {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });
            const values = {};
            formatter.formatToParts(date).forEach((part) => {
                values[part.type] = part.value;
            });
            return {
                year: Number(values.year),
                month: Number(values.month),
                day: Number(values.day),
                hour: Number(values.hour),
                minute: Number(values.minute),
                second: Number(values.second),
                millisecond: date.getMilliseconds(),
            };
        }
        catch (_a) {
            return localParts(date);
        }
    }
    return localParts(date);
}
function localParts(date) {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        millisecond: date.getMilliseconds(),
    };
}
function normalizeFormat(format) {
    return format.replace(/YYYY/g, 'yyyy').replace(/DD/g, 'dd').replace(/Y/g, 'y').replace(/D/g, 'd').replace(/'/g, '');
}
function sanitizeStep(step) {
    if (step === undefined || !Number.isFinite(step)) {
        return 1;
    }
    return Math.min(60, Math.max(1, Math.round(step)));
}
function isDateOnly(value, mode) {
    return mode === 'date' || /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function emptyRange() {
    return {
        start: null,
        end: null,
        value: null,
    };
}
function pad(value, length = 2) {
    return String(value).padStart(length, '0');
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    DatePickerWeb: DatePickerWeb
});

exports.DatePicker = DatePicker;
//# sourceMappingURL=plugin.cjs.js.map
