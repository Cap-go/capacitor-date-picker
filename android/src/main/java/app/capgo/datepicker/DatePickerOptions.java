package app.capgo.datepicker;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginConfig;
import java.text.ParseException;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONObject;

class DatePickerOptions {

    static final String DEFAULT_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";

    String format = DEFAULT_FORMAT;
    String locale;
    String mode = "dateAndTime";
    String theme = "light";
    String timezone;
    String title;
    String startTitle;
    String endTitle;
    String doneText;
    String cancelText;
    boolean is24h = false;
    int minuteStep = 1;
    Date date;
    Date min;
    Date max;
    Date start;
    Date end;
    boolean range = false;

    static DatePickerOptions fromConfig(PluginConfig config) {
        DatePickerOptions options = new DatePickerOptions();
        options.theme = config.getString("android.theme", config.getString("theme", options.theme));
        options.mode = config.getString("android.mode", config.getString("mode", options.mode));
        options.format = config.getString("android.format", config.getString("format", options.format));
        options.timezone = config.getString("android.timezone", config.getString("timezone", options.timezone));
        options.locale = config.getString("android.locale", config.getString("locale", options.locale));
        options.title = config.getString("android.title", config.getString("title", options.title));
        options.startTitle = config.getString("android.startTitle", config.getString("startTitle", options.startTitle));
        options.endTitle = config.getString("android.endTitle", config.getString("endTitle", options.endTitle));
        options.cancelText = config.getString("android.cancelText", config.getString("cancelText", options.cancelText));
        options.doneText = config.getString("android.doneText", config.getString("doneText", options.doneText));
        options.is24h = config.getBoolean("android.is24h", config.getBoolean("is24h", options.is24h));
        options.minuteStep = sanitizeStep(config.getInt("android.minuteStep", config.getInt("minuteStep", options.minuteStep)));
        return options;
    }

    DatePickerOptions copyWithCall(PluginCall call, boolean forceRange) throws ParseException {
        DatePickerOptions options = copy();
        options.theme = getString(call, "theme", options.theme);
        options.mode = getString(call, "mode", options.mode);
        options.format = getString(call, "format", options.format);
        options.timezone = getString(call, "timezone", options.timezone);
        options.locale = getString(call, "locale", options.locale);
        options.title = getString(call, "title", options.title);
        options.startTitle = getString(call, "startTitle", options.startTitle);
        options.endTitle = getString(call, "endTitle", options.endTitle);
        options.cancelText = getString(call, "cancelText", options.cancelText);
        options.doneText = getString(call, "doneText", options.doneText);
        options.is24h = getBoolean(call, "is24h", options.is24h);
        options.minuteStep = sanitizeStep(getInt(call, "minuteStep", getInt(call, "steps", options.minuteStep)));
        options.range = forceRange || options.mode.equals("range");

        String dateValue = call.getString("date", null);
        String minValue = call.getString("min", null);
        String maxValue = call.getString("max", null);
        String startValue = call.getString("start", null);
        String endValue = call.getString("end", null);

        options.date = DateParser.parse(dateValue, options);
        options.min = DateParser.parse(minValue, options);
        options.max = DateParser.parse(maxValue, options);
        options.start = DateParser.parse(startValue, options);
        options.end = DateParser.parse(endValue, options);
        return options;
    }

    Locale localeValue() {
        if (locale == null || locale.isEmpty()) {
            return Locale.getDefault();
        }
        return Locale.forLanguageTag(locale.replace("_", "-"));
    }

    TimeZone timeZoneValue() {
        if (timezone == null || timezone.isEmpty()) {
            return TimeZone.getDefault();
        }
        return TimeZone.getTimeZone(timezone);
    }

    DatePickerOptions copy() {
        DatePickerOptions copy = new DatePickerOptions();
        copy.format = format;
        copy.locale = locale;
        copy.mode = mode;
        copy.theme = theme;
        copy.timezone = timezone;
        copy.title = title;
        copy.startTitle = startTitle;
        copy.endTitle = endTitle;
        copy.doneText = doneText;
        copy.cancelText = cancelText;
        copy.is24h = is24h;
        copy.minuteStep = minuteStep;
        copy.date = date;
        copy.min = min;
        copy.max = max;
        copy.start = start;
        copy.end = end;
        copy.range = range;
        return copy;
    }

    private static String getString(PluginCall call, String key, String fallback) {
        Object value = platformValue(call, key);
        if (value instanceof String) {
            return (String) value;
        }
        return call.getString(key, fallback);
    }

    private static boolean getBoolean(PluginCall call, String key, boolean fallback) {
        Object value = platformValue(call, key);
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return call.getBoolean(key, fallback);
    }

    private static int getInt(PluginCall call, String key, int fallback) {
        Object value = platformValue(call, key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        Integer callValue = call.getInt(key);
        return callValue == null ? fallback : callValue;
    }

    private static Object platformValue(PluginCall call, String key) {
        JSObject android = call.getObject("android");
        if (android == null || !android.has(key)) {
            return null;
        }

        Object value = android.opt(key);
        return value == JSONObject.NULL ? null : value;
    }

    private static int sanitizeStep(int step) {
        if (step < 1) {
            return 1;
        }
        if (step > 60) {
            return 60;
        }
        return step;
    }
}
