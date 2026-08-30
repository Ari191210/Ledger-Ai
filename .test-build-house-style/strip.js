export function stripDashes(text) {
    // Split on code spans so their contents are never rewritten. Built from a
    // character class rather than a literal, deliberately: a backtick written
    // directly here would unbalance the file for any tool that scans source for
    // template literals, and one such audit runs in CI.
    const TICK = String.fromCharCode(96);
    const fence = TICK + TICK + TICK;
    const splitter = new RegExp("(" + fence + "[\\s\\S]*?" + fence + "|" + TICK + "[^" + TICK + "\\n]*" + TICK + ")", "g");
    return text
        .split(splitter)
        .map((part, i) => i % 2 === 1
        ? part
        : part
            .replace(/\s+[\u2014\u2013\u2015]\s+/g, " ")
            .replace(/\s+--\s+/g, " ")
            .replace(/([A-Za-z0-9])[\u2014\u2013\u2015]([A-Za-z0-9])/g, "$1, $2")
            .replace(/[\u2014\u2013\u2015]/g, ", "))
        .join("");
}
