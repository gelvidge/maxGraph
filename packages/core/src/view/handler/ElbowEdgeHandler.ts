/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import EdgeHandler from './EdgeHandler';
import {
  CURSOR,
  EDGESTYLE,
  ELBOW,
  HANDLE_SIZE,
} from '../../util/Constants';
import InternalEvent from '../event/InternalEvent';
import Point from '../geometry/Point';
import Translations from '../../util/Translations';
import Rectangle from '../geometry/Rectangle';
import { intersects } from '../../util/MathUtils';
import Client from '../../Client';
import { isConsumed } from '../../util/EventUtils';
import CellState from '../cell/CellState';

/**
 * Graph event handler that reconnects edges and modifies control points and
 * the edge label location. Uses {@link TerminalMarker} for finding and
 * highlighting new source and target vertices. This handler is automatically
 * created in {@link Graph#createHandler}. It extends {@link EdgeHandler}.
 *
 * Constructor: mxEdgeHandler
 *
 * Constructs an edge handler for the specified <CellState>.
 *
 * @param state <CellState> of the cell to be modified.
 */
class ElbowEdgeHandler extends EdgeHandler {
  constructor(state: CellState) {
    super(state);
  }

  /**
   * Specifies if a double click on the middle handle should call
   * {@link Graph#flipEdge}. Default is true.
   */
  flipEnabled = true;

  /**
   * Specifies the resource key for the tooltip to be displayed on the single
   * control point for routed edges. If the resource for this key does not
   * exist then the value is used as the error message. Default is
   * 'doubleClickOrientation'.
   */
  // doubleClickOrientationResource: string;
  doubleClickOrientationResource =
    Client.language !== 'none' ? 'doubleClickOrientation' : '';

  /**
   * Overrides {@link EdgeHandler#createBends} to create custom bends.
   */
  createBends() {
    const bends = [];

    // Source
    let bend = this.createHandleShape(0);
    this.initBend(bend);
    bend.setCursor(CURSOR.TERMINAL_HANDLE);
    bends.push(bend);

    // Virtual
    bends.push(
      this.createVirtualBend((evt: MouseEvent) => {
        if (!isConsumed(evt) && this.flipEnabled) {
          this.graph.flipEdge(this.state.cell);
          InternalEvent.consume(evt);
        }
      })
    );

    this.points.push(new Point(0, 0));

    // Target
    bend = this.createHandleShape(2);
    this.initBend(bend);
    bend.setCursor(CURSOR.TERMINAL_HANDLE);
    bends.push(bend);

    return bends;
  }

  /**
   * Creates a virtual bend that supports double clicking and calls
   * {@link Graph#flipEdge}.
   */
  createVirtualBend(dblClickHandler?: (evt: MouseEvent) => void) {
    const bend = this.createHandleShape();
    this.initBend(bend, dblClickHandler);

    bend.setCursor(this.getCursorForBend());

    if (!this.graph.isCellBendable(this.state.cell)) {
      bend.node.style.display = 'none';
    }

    return bend;
  }

  /**
   * Returns the cursor to be used for the bend.
   */
  getCursorForBend() {
    return this.state.style.edgeStyle === EDGESTYLE.TOPTOBOTTOM ||
      (this.state.style.edgeStyle === EDGESTYLE.ELBOW &&
        this.state.style.elbow === ELBOW.VERTICAL)
      ? 'row-resize'
      : 'col-resize';
  }

  /**
   * Returns the tooltip for the given node.
   */
  getTooltipForNode(node: Element) {
    let tip = null;

    if (
      this.bends != null &&
      this.bends[1] != null &&
      (node === this.bends[1].node || node.parentNode === this.bends[1].node)
    ) {
      tip = this.doubleClickOrientationResource;
      tip = Translations.get(tip) || tip; // translate
    }

    return tip;
  }

  /**
   * Converts the given point in-place from screen to unscaled, untranslated
   * graph coordinates and applies the grid.
   *
   * @param point {@link Point} to be converted.
   * @param gridEnabled Boolean that specifies if the grid should be applied.
   */
  convertPoint(point: Point, gridEnabled: boolean) {
    const scale = this.graph.getView().getScale();
    const tr = this.graph.getView().getTranslate();
    const { origin } = this.state;

    if (gridEnabled) {
      point.x = this.graph.snap(point.x);
      point.y = this.graph.snap(point.y);
    }

    point.x = Math.round(point.x / scale - tr.x - origin.x);
    point.y = Math.round(point.y / scale - tr.y - origin.y);

    return point;
  }

  /**
   * Updates and redraws the inner bends.
   *
   * @param p0 {@link Point} that represents the location of the first point.
   * @param pe {@link Point} that represents the location of the last point.
   */
  redrawInnerBends(p0: Point, pe: Point) {
    const g = this.state.cell.getGeometry();
    const pts = this.state.absolutePoints;
    let pt = null;

    // Keeps the virtual bend on the edge shape
    if (pts.length > 1) {
      p0 = pts[1] as Point;
      pe = pts[pts.length - 2] as Point;
    } else if (g!.points != null && g!.points.length > 0) {
      pt = pts[0];
    }

    if (pt == null) {
      pt = new Point(p0.x + (pe.x - p0.x) / 2, p0.y + (pe.y - p0.y) / 2);
    } else {
      pt = new Point(
        this.graph.getView().scale *
        (pt.x + this.graph.getView().translate.x + this.state.origin.x),
        this.graph.getView().scale *
        (pt.y + this.graph.getView().translate.y + this.state.origin.y)
      );
    }

    // Makes handle slightly bigger if the yellow  label handle
    // exists and intersects this green handle
    const b = this.bends[1].bounds;
    let w = b!.width;
    let h = b!.height;
    let bounds = new Rectangle(Math.round(pt.x - w / 2), Math.round(pt.y - h / 2), w, h);

    if (this.manageLabelHandle) {
      this.checkLabelHandle(bounds);
    } else if (
      this.handleImage == null &&
      this.labelShape.visible &&
      this.labelShape.bounds &&
      intersects(bounds, this.labelShape.bounds)
    ) {
      w = HANDLE_SIZE + 3;
      h = HANDLE_SIZE + 3;
      bounds = new Rectangle(Math.floor(pt.x - w / 2), Math.floor(pt.y - h / 2), w, h);
    }

    this.bends[1].bounds = bounds;
    this.bends[1].redraw();

    if (this.manageLabelHandle) {
      this.checkLabelHandle(this.bends[1].bounds);
    }
  }
}

export default ElbowEdgeHandler;
