package app.capgo.datepicker;

import java.text.ParseException;
import java.text.ParsePosition;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class DateParser {

    private static final Pattern DATE_ONLY = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})$");
    private static final String[] FALLBACK_FORMATS = {
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSSX",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "yyyy-MM-dd'T'HH:mm:ssX",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm",
        "yyyy-MM-dd",
        "HH:mm:ss",
        "HH:mm"
    };

    private DateParser() {}

    static Date parse(String value, DatePickerOptions options) throws ParseException {
        if (value == null || value.isEmpty()) {
            return null;
        }

        Matcher dateOnly = DATE_ONLY.matcher(value);
        if (dateOnly.matches()) {
            return dateOnly(
                Integer.parseInt(dateOnly.group(1)),
                Integer.parseInt(dateOnly.group(2)),
                Integer.parseInt(dateOnly.group(3)),
                options
            );
        }

        String format = normalizeFormat(options.format);
        Date formatted = parseWithFormat(value, format, options);
        if (formatted != null) {
            return formatted;
        }

        for (String fallback : FALLBACK_FORMATS) {
            Date parsed = parseWithFormat(value, fallback, options);
            if (parsed != null) {
                return parsed;
            }
        }

        throw new ParseException("Unable to parse date: " + value, 0);
    }

    static String format(Date date, DatePickerOptions options) {
        if (date == null) {
            return null;
        }

        SimpleDateFormat dateFormat = new SimpleDateFormat(normalizeFormat(options.format), options.localeValue());
        dateFormat.setTimeZone(options.timeZoneValue());
        return dateFormat.format(date);
    }

    static String normalizeFormat(String format) {
        if (format == null || format.isEmpty()) {
            return DatePickerOptions.DEFAULT_FORMAT;
        }

        return format.replace("YYYY", "yyyy").replace("DD", "dd").replace("sss", "SSS");
    }

    private static Date parseWithFormat(String value, String format, DatePickerOptions options) {
        SimpleDateFormat dateFormat = new SimpleDateFormat(format, options.localeValue());
        dateFormat.setLenient(false);
        dateFormat.setTimeZone(options.timeZoneValue());

        ParsePosition position = new ParsePosition(0);
        Date parsed = dateFormat.parse(value, position);
        if (parsed == null || position.getIndex() != value.length()) {
            return null;
        }

        return parsed;
    }

    private static Date dateOnly(int year, int month, int day, DatePickerOptions options) {
        Calendar calendar = Calendar.getInstance(options.timeZoneValue(), options.localeValue());
        calendar.clear();
        calendar.set(Calendar.YEAR, year);
        calendar.set(Calendar.MONTH, month - 1);
        calendar.set(Calendar.DAY_OF_MONTH, day);
        calendar.set(Calendar.HOUR_OF_DAY, 12);
        return calendar.getTime();
    }
}
