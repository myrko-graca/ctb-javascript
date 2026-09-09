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
		.header {
		  display: flex;
		  justify-content: space-between;
		  align-items: center;
		  background-color: #1a1a1a;
		  color: #ffffff;
		  padding: 0 1.5rem;
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
		.menu {
		  display: flex;
		  list-style: none;
		  margin: 0;
		  padding: 20px;
		  gap: 1rem;
		}
		.menu a {
		  display: block;
		  font-size: large;
		  padding: 1.3rem 1rem;
		  color: #cccccc;
		  text-decoration: none;
		  transition: color 0.3s, background-color 0.3s;
		}
		.menu a:hover {
		  color: #ffffff;
		  background-color: #2b2b2b;
		}
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
			margin-left: auto; 
			position: relative;
			z-index: 1001; 
		}
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
		  opacity: 0;
		  visibility: hidden;
		  transform: translateY(10px);
		  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
		}
		.dropdown-menu li a {
		  padding: 0.8rem 1rem;
		  font-size: large;
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
		@media (min-width: 769px) {
		  .dropdown-item:hover .dropdown-menu {
			opacity: 1;
			visibility: visible;
			transform: translateY(0);
		  }
		}
		#nav {
			position: absolute;
			right: 20px;
			top: 50%;
			transform: translateY(-50%);
		}
		@media (max-width: 768px) {
		  .header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			height: 50px;
		  }
		  .logo {
		    font-size: 1.3rem;
		  }
		  #nav {
			position: absolute;
			width: 0;
			height: 0;
			visibility: hidden;
			transform: revert!important;
		  }
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
		  #hamburger {
			display: block;
			width: 20px;
			height: 2px;
			background: currentColor;
			position: relative;
			transition: background 0.3s;
		  }
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
		  #nav .menu {
			display: flex;
			flex-direction: column;
			gap: 0;
			position: fixed;
			top: 50px;
			left: 0;
			width: 100%;
			background-color: #1a1a1a;
			height: 0;
			overflow: hidden;
			opacity: 0;
			visibility: hidden;
			transition: height 0.4s ease-in-out, opacity 0.3s, visibility 0.4s;
			z-index: 1000;
			padding: 0;
		  }
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
		}`;
	document.head.appendChild(estilo);
}
export class NavigationMenu {
  constructor(navId, btnMobileId, dropdownToggleClass, dropdownItemClass, onLinkClick = null) {
    this.nav = document.getElementById(navId);
    this.btnMobile = document.getElementById(btnMobileId);
    this.dropdownToggles = document.querySelectorAll(dropdownToggleClass);    
    this.onLinkClick = onLinkClick;

    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleDropdown = this.toggleDropdown.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleMenuLinkClick = this.handleMenuLinkClick.bind(this);

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
      const currentItem = event.currentTarget.parentElement;
      document.querySelectorAll('.dropdown-item').forEach(item => {
        if (item !== currentItem) item.classList.remove('open');
      });
      currentItem.classList.toggle('open');
    }
  }
  closeAllMenus() {
    if (this.nav && this.btnMobile) {
      this.nav.classList.remove('active');
      this.btnMobile.classList.remove('active');
      document.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('open'));      
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
  handleMenuLinkClick(event) {
    if (event.target.classList.contains('dropdown-toggle')) return;
    this.closeAllMenus();
    if (typeof this.onLinkClick === 'function') {
      this.onLinkClick(event, event.target);
    }
  }
  init() {
    if (this.btnMobile && this.nav) {
      this.btnMobile.addEventListener('click', this.toggleMenu);
      this.btnMobile.addEventListener('touchstart', this.toggleMenu);
      this.dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', this.toggleDropdown);
      });
      const links = this.nav.querySelectorAll('.menu a');
      links.forEach(link => link.addEventListener('click', this.handleMenuLinkClick));
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleKeyPress);
    }
  }
}
