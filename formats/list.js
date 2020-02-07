import Parchment from 'parchment';
import Block from '../blots/block';
import Container from '../blots/container';


class ListItem extends Block {
  static formats(domNode) {
    return domNode.tagName === this.tagName ? undefined : super.formats(domNode);
  }

  format(name, value) {
    if (name === List.blotName && !value) {
      this.replaceWith(Parchment.create(this.statics.scope));
    } else {
      super.format(name, value);
    }
  }

  remove() {
    if (this.prev == null && this.next == null) {
      this.parent.remove();
    } else {
      super.remove();
    }
  }

  replaceWith(name, value) {
    this.parent.isolate(this.offset(this.parent), this.length());
    if (name === this.parent.statics.blotName) {
      this.parent.replaceWith(name, value);
      return this;
    } else {
      this.parent.unwrap();
      return super.replaceWith(name, value);
    }
  }
}
ListItem.blotName = 'list-item';
ListItem.tagName = 'LI';


class List extends Container {
  static create(value) {
    let tagName = value === 'ordered' ? 'OL' : 'UL';
    let node = super.create(tagName);
    if (value === 'checked' || value === 'unchecked') {
      node.setAttribute('data-checked', value === 'checked');
    }
    return node;
  }

  static formats(domNode) {
    if (domNode.tagName === 'OL') return 'ordered';
    if (domNode.tagName === 'UL') {
      if (domNode.hasAttribute('data-checked')) {
        return domNode.getAttribute('data-checked') === 'true' ? 'checked' : 'unchecked';
      } else {
        return 'bullet';
      }
    }
    return undefined;
  }

  constructor(domNode) {
    super(domNode);
    const listEventHandler = (e) => {
      if (e.target.parentNode !== domNode) return;
      let format = this.statics.formats(domNode);
      let blot = Parchment.find(e.target);
      if (format === 'checked') {
        blot.format('list', 'unchecked');
      } else if(format === 'unchecked') {
        blot.format('list', 'checked');
      }
    }

    domNode.addEventListener('touchstart', listEventHandler);
    domNode.addEventListener('mousedown', listEventHandler);
  }

  format(name, value) {
    if (this.children.length > 0) {
      this.children.tail.format(name, value);
    }
  }

  formats() {
    // We don't inherit from FormatBlot
    return { [this.statics.blotName]: this.statics.formats(this.domNode) };
  }

  mqUpdateBulletColor(blot) {
    if (blot.domNode.children.length) {
        const color = blot.domNode.children[0].style.color;
        const allChildrenHaveSameColor = [...blot.domNode.children]
        // When removing list items there is an extra child which contains only a .ql-cursor div
        // we need to filter that out so we can check if all children have the same color
        .filter((node) => !node.querySelector('.ql-cursor'))
        .every(
          (child) => child.style.color === color
        );
        const someChildrenStillHaveColor = [...blot.domNode.children].some(
          (child) => child.style.color
        );

        if (allChildrenHaveSameColor) {
          blot.domNode.style.color = color;
        } else if (!someChildrenStillHaveColor) {
          blot.domNode.style.removeProperty('color');
        }
      }
  }

  insertBefore(blot, ref) {
    if (blot instanceof ListItem) {

      // This runs whenever the nodes get reconstructed (e.g. entering edit mode)
      this.mqUpdateBulletColor(blot);

      super.insertBefore(blot, ref);
    } else {
      let index = ref == null ? this.length() : ref.offset(this);
      let after = this.split(index);
      after.parent.insertBefore(blot, after);
    }
  }

  optimize(context) {
    super.optimize(context);
    let next = this.next;
    if (next != null && next.prev === this &&
        next.statics.blotName === this.statics.blotName &&
        next.domNode.tagName === this.domNode.tagName &&
        next.domNode.getAttribute('data-checked') === this.domNode.getAttribute('data-checked')) {
      next.moveChildren(this);
      next.remove();
    }
  }

  replace(target) {
    if (target.statics.blotName !== this.statics.blotName) {
      let item = Parchment.create(this.statics.defaultChild);
      target.moveChildren(item);
      this.appendChild(item);
    }
    super.replace(target);
  }
}
List.blotName = 'list';
List.scope = Parchment.Scope.BLOCK_BLOT;
List.tagName = ['OL', 'UL'];
List.defaultChild = 'list-item';
List.allowedChildren = [ListItem];


export { ListItem, List as default };
