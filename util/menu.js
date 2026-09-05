if (!document.querySelector("style[id='estilo_menu']")) {
	const estilo = document.createElement('style');
	estilo.id = "estilo_menu";
	estilo.innerHTML = `
.dropdown-menu .divider {
  height: 1px;               /* Espessura do traço */
  background-color: #444444; /* Cor do traço (ajuste se quiser mais claro ou escuro) */
  margin: 0.5rem 0;          /* Espaçamento em cima e embaixo do traço */
  pointer-events: none;      /* Garante que não seja clicável */
}
/* ==========================================================================
   1. ESTILOS GERAIS E RESET
   ========================================================================== */
body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f4f4f9;
}

/* ==========================================================================
   2. CABEÇALHO (HEADER)
   ========================================================================== */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1a1a1a;
  color: #ffffff;
  padding: 0 2rem;
  height: 70px;
  position: relative;
  z-index: 1000;
}

.logo {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
}

/* ==========================================================================
   3. MENU PRINCIPAL (DESKTOP)
   ========================================================================== */
.menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1rem;
}

.menu a {
  display: block;
  padding: 1.3rem 1rem;
  color: #cccccc;
  text-decoration: none;
  transition: color 0.3s, background-color 0.3s;
}

.menu a:hover {
  color: #ffffff;
  background-color: #2b2b2b;
}

/* Botão hambúrguer escondido por padrão no computador */
#btn-mobile {
    display: flex;
    padding: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: #ffffff;
    
    /* ADICIONE ESSA LINHA ABAIXO: Empurra o botão totalmente para a direita */
    margin-left: auto; 
    
    /* Opcional: Garante que ele fique acima do menu se eles se sobreporem */
    position: relative;
    z-index: 1001; 
}

/* ==========================================================================
   4. SUBMENU DROPDOWN (DESKTOP)
   ========================================================================== */
.dropdown-item {
  position: relative;
}

.dropdown-menu {
  display: block;
  position: absolute;
  top: 100%;
  left: 0;
  background-color: #2b2b2b;
  min-width: 180px;
  list-style: none;
  padding: 0;
  margin: 0;
  box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.3);
  
  /* Efeito Invisível Inicial */
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
}

.dropdown-menu li a {
  padding: 0.8rem 1rem;
  font-size: 0.9rem;
  border-bottom: 1px solid #3a3a3a;
}

.dropdown-menu li:last-child a {
  border-bottom: none;
}

.arrow {
  font-size: 0.7rem;
  margin-left: 5px;
  display: inline-block;
  transition: transform 0.3s;
}

/* Ativa o Dropdown ao passar o mouse no Desktop */
@media (min-width: 769px) {
  .dropdown-item:hover .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
}

/* ==========================================================================
   5. RESPONSIVIDADE E BOTÃO HAMBÚRGUER (CELULAR) - VERSÃO CORRIGIDA
   ========================================================================== */
@media (max-width: 768px) {
  /* Força a barra principal a alinhar tudo nas pontas */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Remove o nav do fluxo do topo para ele não ocupar espaço ao lado da logo */
  #nav {
    position: absolute;
    width: 0;
    height: 0;
  }

  /* Exibe o botão do menu e garante que ele fique na extrema direita */
  #btn-mobile {
    display: flex;
    padding: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: #ffffff;
    margin-left: auto; /* Empurra para a direita */
    position: relative;
    z-index: 1001;
  }

  /* Desenha a linha central do hambúrguer */
  #hamburger {
    display: block;
    width: 20px;
    height: 2px;
    background: currentColor;
    position: relative;
    transition: background 0.3s;
  }

  /* Desenha as linhas de cima (before) e de baixo (after) */
  #hamburger::before,
  #hamburger::after {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: currentColor;
    position: absolute;
    transition: transform 0.3s, top 0.3s;
  }

  #hamburger::before { top: -6px; }
  #hamburger::after { top: 6px; }

  /* --- ANIMAÇÃO: Transforma o Hambúrguer em X --- */
  #btn-mobile.active #hamburger {
    background: transparent;
  }
  #btn-mobile.active #hamburger::before {
    top: 0;
    transform: rotate(135deg);
  }
  #btn-mobile.active #hamburger::after {
    top: 0;
    transform: rotate(-135deg);
  }

  /* --- ESTRUTURA DO MENU NO CELULAR --- */
  #nav .menu {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: fixed; /* Mudado para fixed para isolar totalmente da barra do topo */
    top: 70px;
    left: 0;
    width: 100%;
    background-color: #1a1a1a;
    height: 0;
    overflow: hidden;
    opacity: 0;
    visibility: hidden;
    transition: height 0.4s ease-in-out, opacity 0.3s, visibility 0.4s;
    z-index: 1000;
  }

  /* Quando o menu está aberto */
  #nav.active .menu {
    height: calc(100vh - 70px);
    overflow-y: auto;
    opacity: 1;
    visibility: visible;
  }

  #nav .menu a {
    padding: 1.2rem 2rem;
    border-bottom: 1px solid #2b2b2b;
  }

  /* --- SUBMENU DROPDOWN NO CELULAR --- */
  .dropdown-menu {
    position: static;
    background-color: #111111;
    box-shadow: none;
    max-height: 0;
    opacity: 0;
    visibility: hidden;
    transform: none;
    transition: max-height 0.3s ease-out, opacity 0.3s;
  }

  .dropdown-item.open .dropdown-menu {
    max-height: 300px;
    opacity: 1;
    visibility: visible;
  }

  .dropdown-item.open .arrow {
    transform: rotate(180deg);
  }
}

	`;
	document.head.appendChild(estilo);
}
export class NavigationMenu {
  // 1. Adicione um novo parâmetro 'onLinkClick' no constructor
  constructor(navId, btnMobileId, dropdownToggleClass, dropdownItemClass, onLinkClick = null) {
    this.nav = document.getElementById(navId);
    this.btnMobile = document.getElementById(btnMobileId);
    this.dropdownToggle = document.querySelector(dropdownToggleClass);
    this.dropdownItem = document.querySelector(dropdownItemClass);
    this.onLinkClick = onLinkClick; // <-- Guarda a função que você quer executar

    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleDropdown = this.toggleDropdown.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleMenuLinkClick = this.handleMenuLinkClick.bind(this); // <-- Vincula o novo método

    this.init();
  }

  toggleMenu(event) {
    if (event.type === 'touchstart') event.preventDefault();
    this.nav.classList.toggle('active');
    this.btnMobile.classList.toggle('active');
    
    const active = this.nav.classList.contains('active');
    this.btnMobile.setAttribute('aria-expanded', active);
  }

  toggleDropdown(event) {
    if (window.innerWidth <= 768) {
      event.preventDefault();
      this.dropdownItem.classList.toggle('open');
    }
  }

  closeAllMenus() {
    if (this.nav && this.btnMobile) {
      this.nav.classList.remove('active');
      this.btnMobile.classList.remove('active');
      this.dropdownItem.classList.remove('open');
      this.btnMobile.setAttribute('aria-expanded', 'false');
    }
  }

  handleOutsideClick(event) {
    const clickedOutside = !this.btnMobile.contains(event.target) && !this.nav.contains(event.target);
    if (clickedOutside) {
      this.closeAllMenus();
    }
  }

  handleKeyPress(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      this.closeAllMenus();
      if (window.innerWidth <= 768) {
        this.btnMobile.focus();
      }
    }
  }

  // 2. Novo método que gerencia o clique em qualquer link do menu
  handleMenuLinkClick(event) {
    // Evita rodar o código se clicou no botão que apenas abre o dropdown
    if (event.target.classList.contains('dropdown-toggle')) return;

    // Fecha o menu automaticamente após o clique (ótimo para celular)
    this.closeAllMenus();

    // Se você passou uma função personalizada, ela roda agora passando o evento e o link clicado
    if (typeof this.onLinkClick === 'function') {
      this.onLinkClick(event, event.target);
    }
  }

  init() {
    if (this.btnMobile && this.nav) {
      this.btnMobile.addEventListener('click', this.toggleMenu);
      this.btnMobile.addEventListener('touchstart', this.toggleMenu);
      
      if (this.dropdownToggle) {
        this.dropdownToggle.addEventListener('click', this.toggleDropdown);
      }

      // 3. Escuta cliques em todos os links de dentro do menu
      const links = this.nav.querySelectorAll('.menu a');
      links.forEach(link => link.addEventListener('click', this.handleMenuLinkClick));

      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleKeyPress);
    }
  }
}
