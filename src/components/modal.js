import { qs } from '../utils/dom.js';

export function openModal(id) {
  qs('#' + id).classList.add('active');
}

export function closeModal(id) {
  qs('#' + id).classList.remove('active');
}
