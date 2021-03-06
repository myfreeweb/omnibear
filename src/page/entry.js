// TODO: replace this lib with a better mf parser, preferably
// one that doesn't blow up while tests run in Node environment
import microformat from 'microformat-shiv';
import {getAncestorNode, getAncestorNodeByClass} from './dom';

const CLASS_NAME = '__omnibear-selected-item';
let currentItem;
let currentItemUrl;

export function clearItem() {
  if (currentItem) {
    chrome.runtime.sendMessage({
      action: 'clear-entry',
    });
    removeHighlight();
  }
}

export function removeHighlight() {
  if (currentItem) {
    currentItem.classList.remove(CLASS_NAME);
    currentItem = null;
    currentItemUrl = null;
  }
}

export function focusClickedEntry(e) {
  clearItem();
  let entry;
  if (document.location.hostname === 'twitter.com') {
    entry = findTweet(e.target);
  } else if (document.location.hostname === 'www.facebook.com') {
    entry = findFacebookPost(e.target);
  } else {
    entry = findHEntry(e.target);
  }

  if (!entry) {
    return;
  }
  chrome.runtime.sendMessage({
    action: 'select-entry',
    payload: {url: entry.url},
  });
  entry.element.classList.add(CLASS_NAME);
  currentItem = entry.element;
  currentItemUrl = entry.url;
}

function findTweet(el) {
  const element = getAncestorNodeByClass(el, 'tweet');
  if (!element) {
    return false;
  }
  const url = `https://twitter.com${element.getAttribute('data-permalink-path')}`;
  return {element, url};
}

function findFacebookPost(el) {
  const element = getAncestorNode(el, e => {
    return e.id.startsWith('hyperfeed_story_id_');
  });
  if (!element) {
    return false;
  }

  let timestamp = element.getElementsByClassName('timestampContent');
  if (timestamp && timestamp[0]) {
    timestamp = timestamp[0];
    while (timestamp.tagName != 'A' && timestamp.tagName != 'BODY') {
      timestamp = timestamp.parentElement;
    }

    const url = timestamp.href;
    if (url) {
      return {element, url};
    }
  }

  return false;
}

function findHEntry(el) {
  const element = getAncestorNodeByClass(el, 'h-entry');
  if (!element) {
    return false;
  }
  const mf = microformat.get({node: element});
  let url;
  if (mf.items.length && mf.items[0].properties && mf.items[0].properties.url) {
    url = mf.items[0].properties.url[0];
  }
  if (!url) {
    if (element.tagName === 'BODY') {
      return false;
    } else {
      return findHEntry(element.parentElement, 'h-entry');
    }
  }

  return {element, url};
}

export function getCurrentItemUrl() {
  return currentItemUrl;
}
