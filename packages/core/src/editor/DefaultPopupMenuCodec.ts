/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import DefaultPopupMenu from './DefaultPopupMenu';
import CodecRegistry from '../serialization/CodecRegistry';
import ObjectCodec from '../serialization/ObjectCodec';
import Codec from 'src/serialization/Codec';

/**
 * Custom codec for configuring <DefaultPopupMenu>s. This class is created
 * and registered dynamically at load time and used implicitly via
 * <Codec> and the <CodecRegistry>. This codec only reads configuration
 * data for existing popup menus, it does not encode or create menus. Note
 * that this codec only passes the configuration node to the popup menu,
 * which uses the config to dynamically create menus. See
 * <DefaultPopupMenu.createMenu>.
 */
class DefaultPopupMenuCodec extends ObjectCodec {
  constructor() {
    super(new DefaultPopupMenu());
  }

  /**
   * Returns null.
   */
  encode(enc: Codec, obj: Element): Element | null {
    return null;
  }

  /**
   * Uses the given node as the config for <DefaultPopupMenu>.
   */
  decode(dec: Codec, node: Element, into: any) {
    const inc = node.getElementsByTagName('include')[0];

    if (inc != null) {
      this.processInclude(dec, inc, into);
    } else if (into != null) {
      into.config = node;
    }

    return into;
  }
}

CodecRegistry.register(new DefaultPopupMenuCodec());
export default DefaultPopupMenuCodec;
