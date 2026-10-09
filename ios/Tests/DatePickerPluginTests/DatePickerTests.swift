import XCTest
@testable import DatePickerPlugin

class DatePickerTests: XCTestCase {
    func testGetPluginVersion() {
        let implementation = DatePicker()
        XCTAssertEqual("ios", implementation.getPluginVersion())
    }

    func testFontColorOptionIsStoredOnIosOptions() {
        let options = DatePickerOptions()
        options.fontColor = "#FF5500"
        XCTAssertEqual("#FF5500", options.fontColor)
    }

    func testMomentStyleDateFormatDoesNotShiftDateOnlyValues() throws {
        let options = DatePickerOptions()
        options.format = "YYYY-MM-DD"
        options.timezone = "GMT+2"

        let parsed = try XCTUnwrap(DateParser.parse("2025-07-01", options: options))
        XCTAssertEqual("2025-07-01", DateParser.format(parsed, options: options))
    }
}
