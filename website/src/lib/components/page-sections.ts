/** One entry of a page's contents list. */
export interface PageSection {
  /** Element id of the section this entry jumps to. */
  readonly id: string;
  readonly label: string;
}
