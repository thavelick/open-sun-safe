const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .card {
      background: white;
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
      margin-bottom: 20px;
    }
    .card-header {
      border-bottom: 1px solid #eee;
      padding: 12px 16px;
    }
    ::slotted([slot="header"]) {
      margin: 0;
      font-size: 1.2rem;
      color: var(--dark-color);
    }
    .card-content {
      padding: 16px;
    }
  </style>
  <div class="card">
    <div class="card-header"><slot name="header"></slot></div>
    <div class="card-content"><slot name="content"></slot></div>
  </div>
`;
class AppCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({mode: 'open'});
    shadow.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('app-card', AppCard);
