/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

type EventProperties = Record<string, any>;

/**
 * The mxEventObject is a wrapper for all properties of a single event.
 * Additionally, it also offers functions to consume the event and check if it
 * was consumed as follows:
 *
 * ```javascript
 * evt.consume();
 * INV: evt.isConsumed() == true
 * ```
 *
 * Constructor: mxEventObject
 *
 * Constructs a new event object with the specified name. An optional
 * sequence of key, value pairs can be appended to define properties.
 *
 * Example:
 *
 * ```javascript
 * new mxEventObject("eventName", key1, val1, .., keyN, valN)
 * ```
 */
class EventObject {
  constructor(name = '', ...args: any[]) {
    this.name = name;
    this.properties = {};

    if (!!args[0] && args[0].constructor === Object) {
      // A literal object ({})
      for (const [key, value] of Object.entries(args[0])) {
        this.properties[key] = value;
      }
    } else {
      // two-values [key, value, key, value, ...]
      for (let i = 0; i < args.length; i += 2) {
        if (args[i + 1] !== null) {
          this.properties[args[i]] = args[i + 1];
        }
      }
    }
  }

  /**
   * Holds the name.
   */
  name: string;

  /**
   * Holds the properties as an associative array.
   */
  properties: EventProperties;

  /**
   * Holds the consumed state. Default is false.
   */
  consumed: boolean = false;

  /**
   * Returns <name>.
   */
  getName() {
    return this.name;
  }

  /**
   * Returns <properties>.
   */
  getProperties() {
    return this.properties;
  }

  /**
   * Returns the property for the given key.
   */
  getProperty(key: string) {
    return this.properties[key];
  }

  /**
   * Returns true if the event has been consumed.
   */
  isConsumed() {
    return this.consumed;
  }

  /**
   * Consumes the event.
   */
  consume() {
    this.consumed = true;
  }
}

export default EventObject;
