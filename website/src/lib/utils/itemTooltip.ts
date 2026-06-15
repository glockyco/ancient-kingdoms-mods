const TOOLTIP_TITLE_PATTERN =
  /^<b><span style="color:\s*(#[0-9A-Fa-f]{6})"><span style="font-size:\s*14px">[^<]*<\/span><br><\/span><\/b>\n?/;

export interface ParsedItemTooltip {
  titleColor: string;
  tooltipHtml: string;
}

export function parseItemTooltip(
  tooltipHtml: string | null,
): ParsedItemTooltip {
  if (!tooltipHtml) {
    return { titleColor: "#d8d8d8", tooltipHtml: "" };
  }

  const titleMatch = TOOLTIP_TITLE_PATTERN.exec(tooltipHtml);
  if (!titleMatch) {
    return { titleColor: "#d8d8d8", tooltipHtml };
  }

  return {
    titleColor: titleMatch[1],
    tooltipHtml,
  };
}
