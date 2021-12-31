/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import EventSource from '../event/EventSource';
import InternalEvent from '../event/InternalEvent';
import { Graph } from '../Graph';

/**
 * Manager for automatically saving diagrams. The <save> hook must be
 * implemented.
 *
 * ```javascript
 * var mgr = new AutoSaveManager(editor.graph);
 * mgr.save()
 * {
 *   MaxLog.show();
 *   MaxLog.debug('save');
 * };
 * ```
 *
 * @class AutoSaveManager
 * @extends EventSource
 */
class AutoSaveManager extends EventSource {
  constructor(graph: Graph) {
    super();

    // Notifies the manager of a change
    this.changeHandler = (sender: any, evt: any) => {
      if (this.isEnabled()) {
        this.graphModelChanged(evt.getProperty('edit').changes);
      }
    };

    this.setGraph(graph);
  }

  /**
   * Reference to the enclosing {@link Graph}.
   */
  graph: Graph | null = null;

  /**
   * Minimum amount of seconds between two consecutive autosaves. Eg. a
   * value of 1 (s) means the graph is not stored more than once per second.
   * Default is 10.
   */
  autoSaveDelay: number = 10;

  /**
   * Minimum amount of seconds between two consecutive autosaves triggered by
   * more than <autoSaveThreshhold> changes within a timespan of less than
   * <autoSaveDelay> seconds. Eg. a value of 1 (s) means the graph is not
   * stored more than once per second even if there are more than
   * <autoSaveThreshold> changes within that timespan. Default is 2.
   */
  autoSaveThrottle: number = 2;

  /**
   * Minimum amount of ignored changes before an autosave. Eg. a value of 2
   * means after 2 change of the graph model the autosave will trigger if the
   * condition below is true. Default is 5.
   */
  autoSaveThreshold: number = 5;

  /**
   * Counter for ignored changes in autosave.
   */
  ignoredChanges: number = 0;

  /**
   * Used for autosaving. See <autosave>.
   */
  lastSnapshot: number = 0;

  /**
   * Specifies if event handling is enabled. Default is true.
   */
  enabled: boolean = true;

  /**
   * Holds the function that handles graph model changes.
   */
  changeHandler: Function;

  /**
   * Returns true if events are handled. This implementation
   * returns <enabled>.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enables or disables event handling. This implementation
   * updates <enabled>.
   *
   * @param enabled - Boolean that specifies the new enabled state.
   */
  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * Sets the graph that the layouts operate on.
   */
  setGraph(graph: Graph | null): void {
    if (this.graph != null) {
      this.graph.getDataModel().removeListener(this.changeHandler);
    }

    this.graph = graph;

    if (this.graph != null) {
      this.graph.getDataModel().addListener(InternalEvent.CHANGE, this.changeHandler);
    }
  }

  /**
   * Empty hook that is called if the graph should be saved.
   */
  save(): void {
    // empty
  }

  /**
   * Invoked when the graph model has changed.
   */
  graphModelChanged(changes: any): void {
    const now = new Date().getTime();
    const dt = (now - this.lastSnapshot) / 1000;

    if (
      dt > this.autoSaveDelay ||
      (this.ignoredChanges >= this.autoSaveThreshold && dt > this.autoSaveThrottle)
    ) {
      this.save();
      this.reset();
    } else {
      // Increments the number of ignored changes
      this.ignoredChanges++;
    }
  }

  /**
   * Resets all counters.
   */
  reset(): void {
    this.lastSnapshot = new Date().getTime();
    this.ignoredChanges = 0;
  }

  /**
   * Removes all handlers from the <graph> and deletes the reference to it.
   */
  destroy(): void {
    this.setGraph(null);
  }
}

export default AutoSaveManager;
