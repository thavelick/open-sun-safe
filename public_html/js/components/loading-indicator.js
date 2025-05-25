const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: none; }
    :host([visible]) { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0;}
    .loading-spinner { width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid var(--primary-color); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:12px; }
    @keyframes spin { 0%{transform:rotate(0)}100%{transform:rotate(360deg)} }
  </style>
  <div class="loading-spinner"></div>
  <slot>Loading UV data…</slot>
`;
class LoadingIndicator extends HTMLElement {
  static get observedAttributes() { return ['visible']; }
  constructor() {
    super();
    const shadow = this.attachShadow({mode: 'open'});
    shadow.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('loading-indicator', LoadingIndicator);
