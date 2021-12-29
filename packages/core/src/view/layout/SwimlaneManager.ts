/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import EventSource from '../event/EventSource';
import InternalEvent from '../event/InternalEvent';
import Rectangle from '../geometry/Rectangle';
import { Graph } from '../Graph';
import EventObject from '../event/EventObject';
import Cell from '../cell/Cell';
import CellArray from '../cell/CellArray';

/**
 * @class SwimlaneManager
 * @extends EventSource
 *
 * Manager for swimlanes and nested swimlanes that sets the size of newly added
 * swimlanes to that of their siblings, and propagates changes to the size of a
 * swimlane to its siblings, if {@link siblings} is true, and its ancestors, if
 * {@link bubbling} is true.
 */
class SwimlaneManager extends EventSource {
  constructor(
    graph: Graph,
    horizontal: boolean = true,
    addEnabled: boolean = true,
    resizeEnabled: boolean = true
  ) {
    super();

    this.horizontal = horizontal;
    this.addEnabled = addEnabled;
    this.resizeEnabled = resizeEnabled;

    this.addHandler = (sender: EventSource, evt: EventObject) => {
      if (this.isEnabled() && this.isAddEnabled()) {
        this.cellsAdded(evt.getProperty('cells'));
      }
    };

    this.resizeHandler = (sender: EventSource, evt: EventObject) => {
      if (this.isEnabled() && this.isResizeEnabled()) {
        this.cellsResized(evt.getProperty('cells'));
      }
    };

    this.setGraph(graph);
  }

  /**
   * Reference to the enclosing {@link graph}.
   */
  graph!: Graph;

  /**
   * Specifies if event handling is enabled.
   * @default true
   */
  enabled = true;

  /**
   * Specifies the orientation of the swimlanes.
   * @default true
   */
  horizontal = true;

  /**
   * Specifies if newly added cells should be resized to match the size of their
   * existing siblings.
   * @default true
   */
  addEnabled = true;

  /**
   * Specifies if resizing of swimlanes should be handled.
   * @default true
   */
  resizeEnabled = true;

  /**
   * Holds the function that handles the move event.
   */
  addHandler: (sender: EventSource, evt: EventObject) => void;

  /**
   * Holds the function that handles the move event.
   */
  resizeHandler: (sender: EventSource, evt: EventObject) => void;

  /**
   * Returns true if events are handled. This implementation
   * returns {@link enabled}.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Enables or disables event handling. This implementation
   * updates {@link enabled}.
   *
   * @param enabled Boolean that specifies the new enabled state.
   */
  setEnabled(value: boolean) {
    this.enabled = value;
  }

  /**
   * Returns {@link horizontal}.
   */
  isHorizontal() {
    return this.horizontal;
  }

  /**
   * Sets {@link horizontal}.
   */
  setHorizontal(value: boolean) {
    this.horizontal = value;
  }

  /**
   * Returns {@link addEnabled}.
   */
  isAddEnabled() {
    return this.addEnabled;
  }

  /**
   * Sets {@link addEnabled}.
   */
  setAddEnabled(value: boolean) {
    this.addEnabled = value;
  }

  /**
   * Returns {@link resizeEnabled}.
   */
  isResizeEnabled() {
    return this.resizeEnabled;
  }

  /**
   * Sets {@link resizeEnabled}.
   */
  setResizeEnabled(value: boolean) {
    this.resizeEnabled = value;
  }

  /**
   * Returns the graph that this manager operates on.
   */
  getGraph() {
    return this.graph;
  }

  /**
   * Sets the graph that the manager operates on.
   */
  setGraph(graph: Graph | null) {
    if (this.graph) {
      this.graph.removeListener(this.addHandler);
      this.graph.removeListener(this.resizeHandler);
    }

    // @ts-expect-error this.graph can be null only when it is being destroyed.
    this.graph = graph;

    if (this.graph) {
      this.graph.addListener(InternalEvent.ADD_CELLS, this.addHandler);
      this.graph.addListener(InternalEvent.CELLS_RESIZED, this.resizeHandler);
    }
  }

  /**
   * Returns true if the given swimlane should be ignored.
   */
  isSwimlaneIgnored(swimlane: Cell) {
    return !this.getGraph()!.isSwimlane(swimlane);
  }

  /**
   * Returns true if the given cell is horizontal. If the given cell is not a
   * swimlane, then the global orientation is returned.
   */
  isCellHorizontal(cell: Cell) {
    if (this.graph.isSwimlane(cell)) {
      const style = this.graph.getCellStyle(cell);
      return style.horizontal ?? true;
    }

    return !this.isHorizontal();
  }

  /**
   * Called if any cells have been added.
   *
   * @param cell Array of {@link Cell} that have been added.
   */
  cellsAdded(cells: CellArray) {
    if (cells.length > 0) {
      const model = this.graph.getDataModel();

      model.beginUpdate();
      try {
        for (const cell of cells) {
          if (!this.isSwimlaneIgnored(cell)) {
            this.swimlaneAdded(cell);
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  }

  /**
   * Updates the size of the given swimlane to match that of any existing
   * siblings swimlanes.
   *
   * @param swimlane {@link mxCell} that represents the new swimlane.
   */
  swimlaneAdded(swimlane: Cell) {
    const parent = <Cell>swimlane.getParent();
    const childCount = parent.getChildCount();
    let geo = null;

    // Finds the first valid sibling swimlane as reference
    for (let i = 0; i < childCount; i += 1) {
      const child = parent.getChildAt(i);

      if (child !== swimlane && !this.isSwimlaneIgnored(child)) {
        geo = child.getGeometry();
        if (geo) {
          break;
        }
      }
    }

    // Applies the size of the refernece to the newly added swimlane
    if (geo) {
      const parentHorizontal = parent ? this.isCellHorizontal(parent) : this.horizontal;
      this.resizeSwimlane(swimlane, geo.width, geo.height, parentHorizontal);
    }
  }

  /**
   * Called if any cells have been resizes. Calls {@link swimlaneResized} for all
   * swimlanes where {@link isSwimlaneIgnored} returns false.
   *
   * @param cells Array of {@link Cell} whose size was changed.
   */
  cellsResized(cells: CellArray) {
    if (cells.length > 0) {
      const model = this.getGraph().getDataModel();

      model.beginUpdate();
      try {
        // Finds the top-level swimlanes and adds offsets
        for (const cell of cells) {
          if (!this.isSwimlaneIgnored(cell)) {
            const geo = cell.getGeometry();

            if (geo) {
              const size = new Rectangle(0, 0, geo.width, geo.height);
              let top = cell;
              let current = top;

              while (current) {
                top = current;
                current = <Cell>current.getParent();
                const tmp = this.graph.isSwimlane(current)
                  ? this.graph.getStartSize(current)
                  : new Rectangle();
                size.width += tmp.width;
                size.height += tmp.height;
              }

              const parentHorizontal = current
                ? this.isCellHorizontal(current)
                : this.horizontal;
              this.resizeSwimlane(top, size.width, size.height, parentHorizontal);
            }
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  }

  /**
   * Called from {@link cellsResized} for all swimlanes that are not ignored to update
   * the size of the siblings and the size of the parent swimlanes, recursively,
   * if {@link bubbling} is true.
   *
   * @param swimlane {@link mxCell} whose size has changed.
   */
  resizeSwimlane(swimlane: Cell, w: number, h: number, parentHorizontal: boolean) {
    const model = this.graph.getDataModel();

    model.beginUpdate();
    try {
      const horizontal = this.isCellHorizontal(swimlane);

      if (!this.isSwimlaneIgnored(swimlane)) {
        let geo = swimlane.getGeometry();

        if (geo) {
          if (
            (parentHorizontal && geo.height !== h) ||
            (!parentHorizontal && geo.width !== w)
          ) {
            geo = geo.clone();

            if (parentHorizontal) {
              geo.height = h;
            } else {
              geo.width = w;
            }

            model.setGeometry(swimlane, geo);
          }
        }
      }

      const tmp = this.graph.isSwimlane(swimlane)
        ? this.graph.getStartSize(swimlane)
        : new Rectangle();
      w -= tmp.width;
      h -= tmp.height;

      const childCount = swimlane.getChildCount();

      for (let i = 0; i < childCount; i += 1) {
        const child = swimlane.getChildAt(i);
        this.resizeSwimlane(child, w, h, horizontal);
      }
    } finally {
      model.endUpdate();
    }
  }

  /**
   * Removes all handlers from the {@link graph} and deletes the reference to it.
   */
  destroy() {
    this.setGraph(null);
  }
}

export default SwimlaneManager;
