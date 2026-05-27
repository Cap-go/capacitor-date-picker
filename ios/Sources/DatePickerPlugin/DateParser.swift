import Foundation

enum DateParser {
    private static let fallbackFormats = [
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm",
        "yyyy-MM-dd",
        "HH:mm:ss",
        "HH:mm"
    ]

    static func parse(_ value: String?, options: DatePickerOptions) throws -> Date? {
        guard let value, !value.isEmpty else {
            return nil
        }

        if let dateOnly = parseDateOnly(value, options: options) {
            return dateOnly
        }

        if let isoDate = parseISO(value) {
            return isoDate
        }

        if let formatted = parse(value, format: normalizeFormat(options.format), options: options) {
            return formatted
        }

        for format in fallbackFormats {
            if let formatted = parse(value, format: format, options: options) {
                return formatted
            }
        }

        throw DatePickerError.parse("Unable to parse date: \(value)")
    }

    static func format(_ date: Date, options: DatePickerOptions) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = normalizeFormat(options.format)
        formatter.locale = options.localeValue
        formatter.timeZone = options.timeZoneValue
        return formatter.string(from: date)
    }

    static func normalizeFormat(_ format: String?) -> String {
        guard let format, !format.isEmpty else {
            return DatePickerOptions.defaultFormat
        }

        return format
            .replacingOccurrences(of: "YYYY", with: "yyyy")
            .replacingOccurrences(of: "DD", with: "dd")
            .replacingOccurrences(of: "sss", with: "SSS")
    }

    private static func parse(_ value: String, format: String, options: DatePickerOptions) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = format
        formatter.locale = options.localeValue
        formatter.timeZone = options.timeZoneValue
        formatter.isLenient = false
        return formatter.date(from: value)
    }

    private static func parseISO(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) {
            return date
        }

        let standard = ISO8601DateFormatter()
        standard.formatOptions = [.withInternetDateTime]
        return standard.date(from: value)
    }

    private static func parseDateOnly(_ value: String, options: DatePickerOptions) -> Date? {
        let parts = value.split(separator: "-")
        guard parts.count == 3,
              let year = Int(parts[0]),
              let month = Int(parts[1]),
              let day = Int(parts[2]) else {
            return nil
        }

        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = options.localeValue
        calendar.timeZone = options.timeZoneValue

        var components = DateComponents()
        components.calendar = calendar
        components.timeZone = options.timeZoneValue
        components.year = year
        components.month = month
        components.day = day
        components.hour = 12
        return calendar.date(from: components)
    }
}

enum DatePickerError: Error {
    case parse(String)
}
