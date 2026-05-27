import Capacitor
import Foundation

final class DatePickerOptions: NSCopying {
    static let defaultFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"

    var format = DatePickerOptions.defaultFormat
    var locale: String?
    var mode = "dateAndTime"
    var theme = "light"
    var timezone: String?
    var title: String?
    var startTitle: String?
    var endTitle: String?
    var doneText = "OK"
    var cancelText = "Cancel"
    var is24h = false
    var minuteStep = 1
    var style = "inline"
    var titleFontColor: String?
    var titleBgColor: String?
    var bgColor: String?
    var fontColor: String?
    var buttonBgColor: String?
    var buttonFontColor: String?
    var mergedDateAndTime = false
    var date: Date?
    var min: Date?
    var max: Date?
    var start: Date?
    var end: Date?
    var range = false

    var localeValue: Locale {
        guard let locale, !locale.isEmpty else {
            return Locale.current
        }
        return Locale(identifier: locale)
    }

    var timeZoneValue: TimeZone {
        guard let timezone, !timezone.isEmpty else {
            return TimeZone.current
        }
        return TimeZone(identifier: timezone) ?? TimeZone(abbreviation: timezone) ?? TimeZone.current
    }

    static func fromConfig(_ config: PluginConfig) -> DatePickerOptions {
        let options = DatePickerOptions()
        options.style = config.getString("ios.style", options.style) ?? options.style
        options.theme = config.getString("ios.theme", config.getString("theme", options.theme)) ?? options.theme
        options.mode = config.getString("ios.mode", config.getString("mode", options.mode)) ?? options.mode
        options.format = config.getString("ios.format", config.getString("format", options.format)) ?? options.format
        options.timezone = config.getString("ios.timezone", config.getString("timezone", options.timezone))
        options.locale = config.getString("ios.locale", config.getString("locale", options.locale))
        options.title = config.getString("ios.title", config.getString("title", options.title))
        options.startTitle = config.getString("ios.startTitle", config.getString("startTitle", options.startTitle))
        options.endTitle = config.getString("ios.endTitle", config.getString("endTitle", options.endTitle))
        options.cancelText = config.getString("ios.cancelText", config.getString("cancelText", options.cancelText)) ?? options.cancelText
        options.doneText = config.getString("ios.doneText", config.getString("doneText", options.doneText)) ?? options.doneText
        options.is24h = config.getBoolean("ios.is24h", config.getBoolean("is24h", options.is24h))
        options.minuteStep = sanitizeMinuteStep(config.getInt("ios.minuteStep", config.getInt("minuteStep", options.minuteStep)))
        options.titleFontColor = config.getString("ios.titleFontColor", options.titleFontColor)
        options.titleBgColor = config.getString("ios.titleBgColor", options.titleBgColor)
        options.bgColor = config.getString("ios.bgColor", options.bgColor)
        options.fontColor = config.getString("ios.fontColor", options.fontColor)
        options.buttonBgColor = config.getString("ios.buttonBgColor", options.buttonBgColor)
        options.buttonFontColor = config.getString("ios.buttonFontColor", options.buttonFontColor)
        options.mergedDateAndTime = config.getBoolean("ios.mergedDateAndTime", options.mergedDateAndTime)
        return options
    }

    func copy(with zone: NSZone? = nil) -> Any {
        return clone()
    }

    func clone() -> DatePickerOptions {
        let clone = DatePickerOptions()
        clone.format = format
        clone.locale = locale
        clone.mode = mode
        clone.theme = theme
        clone.timezone = timezone
        clone.title = title
        clone.startTitle = startTitle
        clone.endTitle = endTitle
        clone.doneText = doneText
        clone.cancelText = cancelText
        clone.is24h = is24h
        clone.minuteStep = minuteStep
        clone.style = style
        clone.titleFontColor = titleFontColor
        clone.titleBgColor = titleBgColor
        clone.bgColor = bgColor
        clone.fontColor = fontColor
        clone.buttonBgColor = buttonBgColor
        clone.buttonFontColor = buttonFontColor
        clone.mergedDateAndTime = mergedDateAndTime
        clone.date = date
        clone.min = min
        clone.max = max
        clone.start = start
        clone.end = end
        clone.range = range
        return clone
    }

    func merged(with call: CAPPluginCall, range: Bool) throws -> DatePickerOptions {
        let options = clone()
        let ios = call.getObject("ios") ?? [:]

        options.style = stringValue("style", call: call, platform: ios) ?? options.style
        options.theme = stringValue("theme", call: call, platform: ios) ?? options.theme
        options.mode = stringValue("mode", call: call, platform: ios) ?? options.mode
        options.format = stringValue("format", call: call, platform: ios) ?? options.format
        options.timezone = stringValue("timezone", call: call, platform: ios) ?? options.timezone
        options.locale = stringValue("locale", call: call, platform: ios) ?? options.locale
        options.title = stringValue("title", call: call, platform: ios) ?? options.title
        options.startTitle = stringValue("startTitle", call: call, platform: ios) ?? options.startTitle
        options.endTitle = stringValue("endTitle", call: call, platform: ios) ?? options.endTitle
        options.cancelText = stringValue("cancelText", call: call, platform: ios) ?? options.cancelText
        options.doneText = stringValue("doneText", call: call, platform: ios) ?? options.doneText
        options.is24h = boolValue("is24h", call: call, platform: ios) ?? options.is24h
        options.minuteStep = DatePickerOptions.sanitizeMinuteStep(
            intValue("minuteStep", call: call, platform: ios) ?? intValue("steps", call: call, platform: ios) ?? options.minuteStep
        )
        options.titleFontColor = stringValue("titleFontColor", call: call, platform: ios) ?? options.titleFontColor
        options.titleBgColor = stringValue("titleBgColor", call: call, platform: ios) ?? options.titleBgColor
        options.bgColor = stringValue("bgColor", call: call, platform: ios) ?? options.bgColor
        options.fontColor = stringValue("fontColor", call: call, platform: ios) ?? options.fontColor
        options.buttonBgColor = stringValue("buttonBgColor", call: call, platform: ios) ?? options.buttonBgColor
        options.buttonFontColor = stringValue("buttonFontColor", call: call, platform: ios) ?? options.buttonFontColor
        options.mergedDateAndTime = boolValue("mergedDateAndTime", call: call, platform: ios) ?? options.mergedDateAndTime
        options.range = range || options.mode == "range"

        options.date = try DateParser.parse(call.getString("date"), options: options)
        options.min = try DateParser.parse(call.getString("min"), options: options)
        options.max = try DateParser.parse(call.getString("max"), options: options)
        options.start = try DateParser.parse(call.getString("start"), options: options)
        options.end = try DateParser.parse(call.getString("end"), options: options)
        return options
    }

    private static func sanitizeMinuteStep(_ step: Int) -> Int {
        let allowed = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30]
        return allowed.min(by: { abs($0 - step) < abs($1 - step) }) ?? 1
    }
}

private func stringValue(_ key: String, call: CAPPluginCall, platform: JSObject) -> String? {
    return platform[key] as? String ?? call.getString(key)
}

private func boolValue(_ key: String, call: CAPPluginCall, platform: JSObject) -> Bool? {
    return platform[key] as? Bool ?? call.getBool(key)
}

private func intValue(_ key: String, call: CAPPluginCall, platform: JSObject) -> Int? {
    if let int = platform[key] as? Int {
        return int
    }
    if let double = platform[key] as? Double {
        return Int(double)
    }
    return call.getInt(key)
}
