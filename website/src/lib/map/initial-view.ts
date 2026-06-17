import { INITIAL_VIEW_STATE } from "./config";
import {
  fitBoundsToViewState,
  type Bounds,
  type FitBoundsToViewStateOptions,
} from "./flyto";
import type { MapUrlState } from "./url-state";

export interface CreateInitialViewStateOptions extends Omit<
  FitBoundsToViewStateOptions,
  "width" | "height"
> {
  urlState: MapUrlState | null;
  hasPositionParams: boolean;
  bounds: Bounds | null;
  width: number;
  height: number;
}

export function createInitialViewState({
  urlState,
  hasPositionParams,
  bounds,
  width,
  height,
  ...fitOptions
}: CreateInitialViewStateOptions): typeof INITIAL_VIEW_STATE {
  if (urlState && hasPositionParams) {
    return {
      target: [urlState.x, urlState.y, 0],
      zoom: urlState.zoom,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: INITIAL_VIEW_STATE.maxZoom,
    };
  }

  if (bounds) {
    const fittedViewState = fitBoundsToViewState(bounds, {
      ...fitOptions,
      width,
      height,
    });
    if (fittedViewState) {
      return {
        target: fittedViewState.target,
        zoom: fittedViewState.zoom,
        minZoom: fittedViewState.minZoom,
        maxZoom: fittedViewState.maxZoom,
      };
    }
  }

  return INITIAL_VIEW_STATE;
}
