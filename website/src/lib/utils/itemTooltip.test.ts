import { describe, expect, test } from "vitest";
import { parseItemTooltip } from "./itemTooltip";

const tooltipHtml = `<b><span style="color: #0070dd"><span style="font-size: 14px">Spirit Walker Tunic</span><br></span></b>
<span style="color: #DA4ADC">No-Trade</span>
Slot: Chest`;

describe("parseItemTooltip", () => {
  test("extracts the title color without removing exported tooltip spacing", () => {
    const parsed = parseItemTooltip(tooltipHtml);

    expect(parsed.titleColor).toBe("#0070dd");
    expect(parsed.tooltipHtml).toBe(tooltipHtml);
  });

  test("leaves unmatched tooltip HTML unchanged", () => {
    const parsed = parseItemTooltip("Slot: Chest");

    expect(parsed.titleColor).toBe("#d8d8d8");
    expect(parsed.tooltipHtml).toBe("Slot: Chest");
  });
});
