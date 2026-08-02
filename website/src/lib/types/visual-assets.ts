/**
 * A runtime-exported image for one entity, as stored in `visual_assets`.
 *
 * `source_type` distinguishes a single sprite from a composited set of
 * renderers, which matters for display: composites are full character rigs and
 * come out several times larger than a single-sprite creature.
 */
export interface EntityVisualAsset {
  public_path: string;
  width: number;
  height: number;
  source_field: string;
  source_type: string;
}
