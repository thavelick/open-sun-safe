const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: none; width:100%; }
    :host([visible]) { display: block; }
    .card { background:white; border-radius:var(--border-radius); box-shadow:var(--box-shadow); margin-bottom:0; }
    .card-content { padding:24px; text-align:center; }
  </style>
  <div class="card">
    <div class="card-content">
      <slot></slot>
    </div>
  </div>
`;
class MessageBox extends HTMLElement {
  static get observedAttributes() { return ['visible']; }
  constructor(){
    super();
    const shadow = this.attachShadow({mode: 'open'});
    shadow.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('message-box', MessageBox);
